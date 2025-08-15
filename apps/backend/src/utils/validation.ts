import Joi from 'joi';

export const trackSchemas = {
  create: Joi.object({
    title: Joi.string().min(1).max(200).required().messages({
      'string.min': 'Track title is required',
      'string.max': 'Track title cannot exceed 200 characters',
      'any.required': 'Track title is required'
    }),
    description: Joi.string().max(1000).optional().allow('').messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    visibility: Joi.string().valid('private', 'project', 'channel').optional().default('private'),
    version: Joi.string().optional().default('001'),
    tags: Joi.array().items(Joi.string()).optional(),
    channelIds: Joi.array().items(Joi.string()).optional(),
    projectIds: Joi.array().items(Joi.string()).optional()
  }),

  update: Joi.object({
    title: Joi.string().min(1).max(200).optional().messages({
      'string.min': 'Track title cannot be empty',
      'string.max': 'Track title cannot exceed 200 characters'
    }),
    description: Joi.string().max(1000).optional().allow('').messages({
      'string.max': 'Description cannot exceed 1000 characters'
    }),
    visibility: Joi.string().valid('private', 'project', 'channel').optional(),
    version: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    channelIds: Joi.array().items(Joi.string()).optional(),
    projectIds: Joi.array().items(Joi.string()).optional()
  })
};

export const commentSchemas = {
  create: Joi.object({
    content: Joi.string().min(1).max(500).required().messages({
      'string.min': 'Comment cannot be empty',
      'string.max': 'Comment cannot exceed 500 characters',
      'any.required': 'Comment content is required'
    }),
    timestamp: Joi.number().min(0).optional().messages({
      'number.min': 'Timestamp cannot be negative'
    }),
    parentId: Joi.string().optional()
  })
};