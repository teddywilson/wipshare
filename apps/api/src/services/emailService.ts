import { Resend } from 'resend';
import { emailWrapper } from './emailTemplates';

// Initialize Resend with API key from environment (optional)
const resendApiKey = process.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'staging.wipshare.com';
const APP_URL = process.env.NODE_ENV === 'production' ? 'https://wipshare.com' : 'https://staging.wipshare.com';

interface SendInvitationEmailParams {
  to: string;
  inviterName: string;
  projectName: string;
  projectType: string;
  role: string;
  invitationLink: string;
}

interface SendWelcomeEmailParams {
  to: string;
  name: string;
}

interface SendWorkspaceInvitationParams {
  to: string;
  inviterName: string;
  workspaceName: string;
  role: string;
  invitationLink: string;
}

export class EmailService {
  static async sendProjectInvitation({
    to,
    inviterName,
    projectName,
    projectType,
    role,
    invitationLink
  }: SendInvitationEmailParams) {
    try {
      const roleClass = role.toLowerCase();
      const rolePermissions: Record<string, string[]> = {
        'Viewer': [
          'Listen to all tracks and versions',
          'View project details and metadata',
          'See version history and changes'
        ],
        'Editor': [
          'Everything a viewer can do, plus:',
          'Upload new tracks and versions',
          'Edit track titles and descriptions',
          'Reorder and organize tracks',
          'Archive or restore tracks'
        ],
        'Owner': [
          'Everything an editor can do, plus:',
          'Manage team members and permissions',
          'Delete the entire project',
          'Transfer project ownership',
          'Configure project settings'
        ]
      };

      const htmlContent = `
        <h1>You're invited! 🎵</h1>
        <p><span class="highlight">${inviterName}</span> wants you to collaborate on their ${projectType.toLowerCase()}:</p>
        
        <div class="info-box">
          <p style="font-size: 18px; font-weight: 600; color: #0a0a0a; margin-bottom: 8px;">${projectName}</p>
          <p>Your role: <span class="role-badge ${roleClass}">${role}</span></p>
        </div>
        
        <p>As a ${role.toLowerCase()}, you'll be able to:</p>
        <ul>
          ${rolePermissions[role].map((perm: string) => `<li>${perm}</li>`).join('')}
        </ul>
        
        <div class="button-container">
          <a href="${invitationLink}" class="button">Accept Invitation →</a>
        </div>
        
        <p style="font-size: 14px; color: #888; text-align: center;">
          This invitation expires in 7 days.<br>
          ${!invitationLink.includes('localhost') ? '' : 'No account? You\'ll be able to create one after accepting.'}
        </p>
      `;

      if (!resend) {
        console.warn('Email service not configured - skipping email send');
        return null;
      }

      const { data, error } = await resend.emails.send({
        from: `WipShare <team@${EMAIL_DOMAIN}>`,
        to: [to],
        subject: `${inviterName} invited you to "${projectName}"`,
        html: emailWrapper(htmlContent, 'Collaboration Invitation'),
        text: `
          You've been invited to collaborate on "${projectName}"
          
          ${inviterName} has invited you to join their ${projectType} "${projectName}" as a ${role}.
          
          Accept the invitation: ${invitationLink}
          
          This invitation will expire in 7 days.
          
          If you didn't expect this invitation, you can safely ignore this email.
        `
      });

      if (error) {
        console.error('Failed to send invitation email:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  static async sendInvitationAccepted({
    to,
    memberName,
    projectName
  }: {
    to: string;
    memberName: string;
    projectName: string;
  }) {
    try {
      const htmlContent = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, #10b981, #34d399); border-radius: 50%; line-height: 56px; text-align: center;">
            <span style="color: white; font-size: 28px;">✓</span>
          </div>
        </div>
        
        <h1 style="text-align: center;">Team member joined!</h1>
        
        <p style="text-align: center; font-size: 16px;">
          <span class="highlight">${memberName}</span> has accepted your invitation and is now part of
        </p>
        
        <div class="info-box" style="text-align: center;">
          <p style="font-size: 18px; font-weight: 600; color: #0a0a0a;">${projectName}</p>
        </div>
        
        <p style="text-align: center; color: #666; margin-top: 24px;">
          They can now access the project and start collaborating with your team.
        </p>
        
        <div class="button-container">
          <a href="${APP_URL}/projects" class="button">View Project →</a>
        </div>
      `;

      if (!resend) {
        console.warn('Email service not configured - skipping email send');
        return null;
      }

      const { data, error } = await resend.emails.send({
        from: `WipShare <notifications@${EMAIL_DOMAIN}>`,
        to: [to],
        subject: `${memberName} joined "${projectName}"`,
        html: emailWrapper(htmlContent, 'New Team Member'),
        text: `${memberName} has accepted your invitation and joined "${projectName}".`
      });

      if (error) {
        console.error('Failed to send acceptance notification:', error);
        // Don't throw - this is not critical
      }

      return data;
    } catch (error) {
      console.error('Email service error:', error);
      // Don't throw - this is not critical
      return undefined;
    }
  }

  static async sendWelcomeEmail({ to, name }: SendWelcomeEmailParams): Promise<any> {
    try {
      const htmlContent = `
        <h1>Welcome to WipShare, ${name}! 👋</h1>
        
        <p>We're excited to have you join our community of musicians and creators.</p>
        
        <p>WipShare is designed to be a <span class="highlight">quiet, focused space</span> where you can:</p>
        
        <ul>
          <li><strong>Share works in progress</strong> – Get feedback on unfinished tracks before release</li>
          <li><strong>Version control for music</strong> – Track how your songs evolve over time</li>
          <li><strong>Collaborate privately</strong> – Work with trusted collaborators in a distraction-free environment</li>
          <li><strong>Control your audience</strong> – Share only with people you choose</li>
        </ul>
        
        <div class="info-box">
          <p><strong>Quick tip:</strong> Start by creating your first project and inviting a few trusted listeners. Keep it small and focused.</p>
        </div>
        
        <div class="button-container">
          <a href="${APP_URL}/dashboard" class="button">Go to Dashboard →</a>
        </div>
        
        <div class="divider"></div>
        
        <p style="text-align: center; color: #666;">
          <strong>Need help?</strong><br>
          Check out our <a href="${APP_URL}/help" style="color: #0a0a0a;">quick start guide</a> or reply to this email.
        </p>
      `;

      if (!resend) {
        console.warn('Email service not configured - skipping email send');
        return null;
      }

      const { data, error } = await resend.emails.send({
        from: `WipShare <hello@${EMAIL_DOMAIN}>`,
        to: [to],
        subject: 'Welcome to WipShare 🎵',
        html: emailWrapper(htmlContent, 'Welcome aboard!'),
        text: `Welcome to WipShare, ${name}! Get started at https://wipshare.com/dashboard`
      });

      if (error) {
        console.error('Failed to send welcome email:', error);
        // Don't throw - welcome emails are not critical
      }

      return data;
    } catch (error) {
      console.error('Email service error:', error);
      // Don't throw - welcome emails are not critical
      return undefined;
    }
  }

  static async sendWorkspaceInvitation({
    to,
    inviterName,
    workspaceName,
    role,
    invitationLink
  }: SendWorkspaceInvitationParams) {
    try {
      const roleClass = role.toLowerCase();
      const rolePermissions: Record<string, string[]> = {
        'member': [
          'Access all workspace projects and tracks',
          'Create new projects',
          'Upload and manage tracks',
          'Collaborate with team members'
        ],
        'admin': [
          'Everything a member can do, plus:',
          'Manage workspace members',
          'Configure workspace settings',
          'Manage billing and usage',
          'Create and manage teams'
        ],
        'owner': [
          'Everything an admin can do, plus:',
          'Transfer workspace ownership',
          'Delete the workspace',
          'Manage API keys and integrations'
        ]
      };

      const htmlContent = `
        <h1>Join a workspace on WipShare 🎵</h1>
        <p><span class="highlight">${inviterName}</span> has invited you to join:</p>
        
        <div class="info-box">
          <p style="font-size: 18px; font-weight: 600; color: #0a0a0a; margin-bottom: 8px;">${workspaceName}</p>
          <p>Your role: <span class="role-badge ${roleClass}">${role}</span></p>
        </div>
        
        <p>As a ${role.toLowerCase()}, you'll be able to:</p>
        <ul>
          ${rolePermissions[role.toLowerCase()]?.map((perm: string) => `<li>${perm}</li>`).join('') || '<li>Access workspace resources</li>'}
        </ul>
        
        <div class="button-container">
          <a href="${invitationLink}" class="button">Join Workspace →</a>
        </div>
        
        <p style="font-size: 14px; color: #888; text-align: center;">
          This invitation expires in 7 days.<br>
          You'll need a WipShare account to join this workspace.
        </p>
      `;

      if (!resend) {
        console.warn('Email service not configured - skipping email send');
        return null;
      }

      const { data, error } = await resend.emails.send({
        from: `WipShare <team@${EMAIL_DOMAIN}>`,
        to: [to],
        subject: `Join "${workspaceName}" workspace on WipShare`,
        html: emailWrapper(htmlContent, 'Workspace Invitation'),
        text: `
          You've been invited to join "${workspaceName}" workspace
          
          ${inviterName} has invited you to join as a ${role}.
          
          Accept the invitation: ${invitationLink}
          
          This invitation will expire in 7 days.
        `
      });

      if (error) {
        console.error('Failed to send workspace invitation email:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  static async sendPasswordReset({
    to,
    name,
    resetLink
  }: {
    to: string;
    name: string;
    resetLink: string;
  }) {
    try {
      const htmlContent = `
        <h1>Password Reset Request</h1>
        
        <p>Hi ${name},</p>
        
        <p>We received a request to reset your WipShare password. Click the button below to create a new password:</p>
        
        <div class="button-container">
          <a href="${resetLink}" class="button">Reset Password →</a>
        </div>
        
        <div class="info-box">
          <p><strong>Security note:</strong> This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.</p>
        </div>
        
        <p style="font-size: 14px; color: #888; text-align: center;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <span style="font-size: 12px; word-break: break-all;">${resetLink}</span>
        </p>
      `;

      if (!resend) {
        console.warn('Email service not configured - skipping email send');
        return null;
      }

      const { data, error } = await resend.emails.send({
        from: `WipShare <security@${EMAIL_DOMAIN}>`,
        to: [to],
        subject: 'Reset your WipShare password',
        html: emailWrapper(htmlContent, 'Password Reset'),
        text: `
          Password Reset Request
          
          Hi ${name},
          
          We received a request to reset your WipShare password.
          
          Reset your password: ${resetLink}
          
          This link will expire in 1 hour.
          
          If you didn't request this reset, you can safely ignore this email.
        `
      });

      if (error) {
        console.error('Failed to send password reset email:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }
}