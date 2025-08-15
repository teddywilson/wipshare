import { Request, Response } from 'express'
import { PrismaClient, PlaylistVisibility } from '@prisma/client'
import crypto from 'crypto'
import { uploadToGCS } from '../lib/storage'

const prisma = new PrismaClient()

// Get user's playlists
export const getMyPlaylists = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const playlists = await prisma.playlist.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            tracks: true,
            followers: true
          }
        },
        tracks: {
          take: 1,
          include: {
            track: {
              select: {
                imageUrl: true
              }
            }
          },
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    // Format response
    const formattedPlaylists = playlists.map(playlist => ({
      ...playlist,
      tracksCount: playlist._count.tracks,
      followersCount: playlist._count.followers,
      coverUrl: playlist.coverUrl || playlist.tracks[0]?.track?.imageUrl,
      tracks: undefined,
      _count: undefined
    }))

    return res.json({ playlists: formattedPlaylists })
  } catch (error) {
    console.error('Error fetching playlists:', error)
    return res.status(500).json({ error: 'Failed to fetch playlists' })
  }
}

// Get playlists from others (following or discoverable)
export const getDiscoverablePlaylists = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Get playlists user is following
    const followedPlaylists = await prisma.playlistFollower.findMany({
      where: { userId },
      include: {
        playlist: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true
              }
            },
            _count: {
              select: {
                tracks: true,
                followers: true
              }
            },
            tracks: {
              take: 1,
              include: {
                track: {
                  select: {
                    imageUrl: true
                  }
                }
              },
              orderBy: { position: 'asc' }
            }
          }
        }
      },
      orderBy: { followedAt: 'desc' }
    })

    // Get public playlists from followed users
    const followedUsers = await prisma.follow.findMany({
      where: {
        followerId: userId,
        status: 'APPROVED'
      },
      select: {
        followingId: true
      }
    })

    const publicPlaylistsFromFollowing = await prisma.playlist.findMany({
      where: {
        userId: {
          in: followedUsers.map(f => f.followingId)
        },
        visibility: {
          in: [PlaylistVisibility.PUBLIC, PlaylistVisibility.FOLLOWERS_ONLY]
        }
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        _count: {
          select: {
            tracks: true,
            followers: true
          }
        },
        tracks: {
          take: 1,
          include: {
            track: {
              select: {
                imageUrl: true
              }
            }
          },
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 20
    })

    // Combine and deduplicate
    const allPlaylists = [
      ...followedPlaylists.map(f => ({
        ...f.playlist,
        isFollowing: true,
        followedAt: f.followedAt
      })),
      ...publicPlaylistsFromFollowing.filter(
        p => !followedPlaylists.some(f => f.playlist.id === p.id)
      ).map(p => ({
        ...p,
        isFollowing: false
      }))
    ]

    // Format response
    const formattedPlaylists = allPlaylists.map(playlist => ({
      ...playlist,
      tracksCount: playlist._count.tracks,
      followersCount: playlist._count.followers,
      coverUrl: playlist.coverUrl || playlist.tracks[0]?.track?.imageUrl,
      tracks: undefined,
      _count: undefined
    }))

    return res.json({ playlists: formattedPlaylists })
  } catch (error) {
    console.error('Error fetching discoverable playlists:', error)
    return res.status(500).json({ error: 'Failed to fetch playlists' })
  }
}

// Get single playlist
export const getPlaylist = async (req: Request, res: Response) => {
  try {
    const { playlistId } = req.params
    const userId = req.user?.id
    const { token } = req.query as { token?: string }

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true
          }
        },
        tracks: {
          include: {
            track: {
              include: {
                user: {
                  select: {
                    username: true,
                    displayName: true
                  }
                }
              }
            }
          },
          orderBy: { position: 'asc' }
        },
        _count: {
          select: {
            followers: true
          }
        },
        followers: userId ? {
          where: { userId },
          select: { id: true }
        } : undefined,
        collaborators: userId ? {
          where: { userId },
          select: {
            canAddTracks: true,
            canRemoveTracks: true,
            canEditDetails: true
          }
        } : undefined
      }
    })

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    // Check access permissions
    const isOwner = playlist.userId === userId
    const isFollowing = playlist.followers && playlist.followers.length > 0
    const isCollaborator = playlist.collaborators && playlist.collaborators.length > 0
    const hasSecretToken = token && playlist.secretToken === token

    // Determine if user has access
    let hasAccess = false
    switch (playlist.visibility) {
      case PlaylistVisibility.PRIVATE:
        hasAccess = isOwner || isCollaborator
        break
      case PlaylistVisibility.FOLLOWERS_ONLY:
        hasAccess = isOwner || isFollowing || isCollaborator
        break
      case PlaylistVisibility.WORKSPACE:
        // Check workspace membership
        if (playlist.workspaceId && userId) {
          const membership = await prisma.workspaceMember.findFirst({
            where: {
              workspaceId: playlist.workspaceId,
              userId
            }
          })
          hasAccess = isOwner || !!membership || isCollaborator
        } else {
          hasAccess = isOwner || isCollaborator
        }
        break
      case PlaylistVisibility.SECRET_LINK:
        hasAccess = isOwner || hasSecretToken || isCollaborator
        break
      case PlaylistVisibility.PUBLIC:
        hasAccess = true
        break
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Log access if using secret token
    if (hasSecretToken && !isOwner) {
      await prisma.playlistAccessLog.create({
        data: {
          playlistId,
          userId,
          accessToken: token,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        }
      })
    }

    // Format response
    const response = {
      ...playlist,
      isOwner,
      isFollowing,
      isCollaborator,
      canEdit: isOwner || (isCollaborator && playlist.collaborators?.[0]?.canEditDetails),
      canAddTracks: isOwner || (isCollaborator && playlist.collaborators?.[0]?.canAddTracks),
      canRemoveTracks: isOwner || (isCollaborator && playlist.collaborators?.[0]?.canRemoveTracks),
      followersCount: playlist._count.followers,
      _count: undefined,
      followers: undefined,
      collaborators: undefined,
      secretToken: isOwner ? playlist.secretToken : undefined
    }

    return res.json({ playlist: response })
  } catch (error) {
    console.error('Error fetching playlist:', error)
    return res.status(500).json({ error: 'Failed to fetch playlist' })
  }
}

// Create playlist
export const createPlaylist = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const {
      title,
      description,
      visibility = PlaylistVisibility.PRIVATE,
      workspaceId,
      tags = [],
      isCollaborative = false
    } = req.body

    const playlist = await prisma.playlist.create({
      data: {
        userId,
        title,
        description,
        visibility,
        workspaceId,
        tags,
        isCollaborative,
        secretToken: visibility === PlaylistVisibility.SECRET_LINK ? crypto.randomBytes(16).toString('hex') : null,
        secretTokenCreatedAt: visibility === PlaylistVisibility.SECRET_LINK ? new Date() : null
      },
      include: {
        user: {
          select: {
            username: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    })

    return res.status(201).json({ playlist })
  } catch (error) {
    console.error('Error creating playlist:', error)
    return res.status(500).json({ error: 'Failed to create playlist' })
  }
}

// Update playlist
export const updatePlaylist = async (req: Request, res: Response) => {
  try {
    const { playlistId } = req.params
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check ownership or collaboration permissions
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        collaborators: {
          where: { userId }
        }
      }
    })

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    const isOwner = playlist.userId === userId
    const canEdit = isOwner || playlist.collaborators[0]?.canEditDetails

    if (!canEdit) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    const {
      title,
      description,
      visibility,
      tags,
      isCollaborative,
      coverUrl
    } = req.body

    // Handle visibility change
    let secretToken = playlist.secretToken
    let secretTokenCreatedAt = playlist.secretTokenCreatedAt

    if (visibility === PlaylistVisibility.SECRET_LINK && !playlist.secretToken) {
      secretToken = crypto.randomBytes(16).toString('hex')
      secretTokenCreatedAt = new Date()
    } else if (visibility !== PlaylistVisibility.SECRET_LINK) {
      secretToken = null
      secretTokenCreatedAt = null
    }

    const updated = await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        title,
        description,
        visibility,
        tags,
        isCollaborative,
        coverUrl,
        secretToken,
        secretTokenCreatedAt
      }
    })

    return res.json({ playlist: updated })
  } catch (error) {
    console.error('Error updating playlist:', error)
    return res.status(500).json({ error: 'Failed to update playlist' })
  }
}

// Delete playlist
export const deletePlaylist = async (req: Request, res: Response) => {
  try {
    const { playlistId } = req.params
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId }
    })

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    await prisma.playlist.delete({
      where: { id: playlistId }
    })

    return res.json({ success: true })
  } catch (error) {
    console.error('Error deleting playlist:', error)
    return res.status(500).json({ error: 'Failed to delete playlist' })
  }
}

// Generate or reset secret link
export const resetSecretLink = async (req: Request, res: Response) => {
  try {
    const { playlistId } = req.params
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId }
    })

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    if (playlist.userId !== userId) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    const newToken = crypto.randomBytes(16).toString('hex')

    const updated = await prisma.playlist.update({
      where: { id: playlistId },
      data: {
        secretToken: newToken,
        secretTokenCreatedAt: new Date(),
        visibility: PlaylistVisibility.SECRET_LINK
      }
    })

    return res.json({ 
      secretToken: newToken,
      secretUrl: `${process.env.FRONTEND_URL}/playlist/${playlistId}?token=${newToken}`
    })
  } catch (error) {
    console.error('Error resetting secret link:', error)
    return res.status(500).json({ error: 'Failed to reset secret link' })
  }
}

// Follow/unfollow playlist
export const toggleFollowPlaylist = async (req: Request, res: Response) => {
  try {
    const { playlistId } = req.params
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const existing = await prisma.playlistFollower.findUnique({
      where: {
        playlistId_userId: {
          playlistId,
          userId
        }
      }
    })

    if (existing) {
      // Unfollow
      await prisma.playlistFollower.delete({
        where: { id: existing.id }
      })

      await prisma.playlist.update({
        where: { id: playlistId },
        data: {
          followersCount: {
            decrement: 1
          }
        }
      })

      return res.json({ following: false })
    } else {
      // Follow
      await prisma.playlistFollower.create({
        data: {
          playlistId,
          userId
        }
      })

      await prisma.playlist.update({
        where: { id: playlistId },
        data: {
          followersCount: {
            increment: 1
          }
        }
      })

      return res.json({ following: true })
    }
  } catch (error) {
    console.error('Error toggling playlist follow:', error)
    return res.status(500).json({ error: 'Failed to toggle follow' })
  }
}

// Add track to playlist
export const addTrackToPlaylist = async (req: Request, res: Response) => {
  try {
    const { playlistId } = req.params
    const { trackId } = req.body
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check permissions
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        collaborators: {
          where: { userId }
        },
        tracks: {
          select: { position: true },
          orderBy: { position: 'desc' },
          take: 1
        }
      }
    })

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    const isOwner = playlist.userId === userId
    const canAdd = isOwner || playlist.collaborators[0]?.canAddTracks

    if (!canAdd) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    // Check if track already in playlist
    const existing = await prisma.playlistTrack.findUnique({
      where: {
        playlistId_trackId: {
          playlistId,
          trackId
        }
      }
    })

    if (existing) {
      return res.status(400).json({ error: 'Track already in playlist' })
    }

    // Get next position
    const nextPosition = (playlist.tracks[0]?.position || 0) + 1

    const playlistTrack = await prisma.playlistTrack.create({
      data: {
        playlistId,
        trackId,
        position: nextPosition,
        addedBy: userId
      },
      include: {
        track: {
          include: {
            user: {
              select: {
                username: true,
                displayName: true
              }
            }
          }
        }
      }
    })

    return res.json({ playlistTrack })
  } catch (error) {
    console.error('Error adding track to playlist:', error)
    return res.status(500).json({ error: 'Failed to add track' })
  }
}

// Remove track from playlist
export const removeTrackFromPlaylist = async (req: Request, res: Response) => {
  try {
    const { playlistId, trackId } = req.params
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check permissions
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        collaborators: {
          where: { userId }
        }
      }
    })

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    const isOwner = playlist.userId === userId
    const canRemove = isOwner || playlist.collaborators[0]?.canRemoveTracks

    if (!canRemove) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    await prisma.playlistTrack.delete({
      where: {
        playlistId_trackId: {
          playlistId,
          trackId
        }
      }
    })

    return res.json({ success: true })
  } catch (error) {
    console.error('Error removing track from playlist:', error)
    return res.status(500).json({ error: 'Failed to remove track' })
  }
}

// Reorder tracks in playlist
export const reorderPlaylistTracks = async (req: Request, res: Response) => {
  try {
    const { playlistId } = req.params
    const { trackOrders } = req.body as { trackOrders: { trackId: string; position: number }[] }
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check permissions
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        collaborators: {
          where: { userId }
        }
      }
    })

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    const isOwner = playlist.userId === userId
    const canEdit = isOwner || playlist.collaborators[0]?.canEditDetails

    if (!canEdit) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    // Update positions in a transaction
    await prisma.$transaction(
      trackOrders.map(({ trackId, position }) =>
        prisma.playlistTrack.update({
          where: {
            playlistId_trackId: {
              playlistId,
              trackId
            }
          },
          data: { position }
        })
      )
    )

    return res.json({ success: true })
  } catch (error) {
    console.error('Error reordering playlist tracks:', error)
    return res.status(500).json({ error: 'Failed to reorder tracks' })
  }
}

// Upload playlist image
export const uploadPlaylistImage = async (req: Request, res: Response) => {
  try {
    const { playlistId } = req.params
    const userId = req.user?.id
    console.log('Upload playlist image:', { playlistId, userId, hasFile: !!req.file })
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const imageFile = req.file
    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' })
    }

    // Check permissions
    const playlist = await prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        collaborators: {
          where: { userId }
        }
      }
    })

    console.log('Found playlist:', !!playlist, playlist?.id, playlist?.userId)
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' })
    }

    const isOwner = playlist.userId === userId
    const canEdit = isOwner || playlist.collaborators[0]?.canEditDetails

    if (!canEdit) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    // Upload image file to Google Cloud Storage
    let imageUrl: string
    try {
      imageUrl = await uploadToGCS(imageFile, userId, `playlist-${playlistId}`)
    } catch (uploadError) {
      console.error('Error uploading image to GCS:', uploadError)
      return res.status(500).json({ error: 'Failed to upload image' })
    }

    // Update playlist with new image URL
    const updatedPlaylist = await prisma.playlist.update({
      where: { id: playlistId },
      data: { coverUrl: imageUrl },
      include: {
        _count: {
          select: {
            tracks: true,
            followers: true
          }
        }
      }
    })

    return res.json({ 
      playlist: {
        ...updatedPlaylist,
        tracksCount: updatedPlaylist._count.tracks,
        followersCount: updatedPlaylist._count.followers,
        _count: undefined
      }
    })
  } catch (error) {
    console.error('Error uploading playlist image:', error)
    return res.status(500).json({ error: 'Failed to upload image' })
  }
}