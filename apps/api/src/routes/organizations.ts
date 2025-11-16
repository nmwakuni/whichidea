import { Hono } from 'hono';
import { db, organizations } from '@savegame/database';
import { eq } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  organizationBrandingSchema,
} from '@savegame/shared';

const org = new Hono();

// All routes require authentication
org.use('*', authenticate());

// Get current organization
org.get('/me', async (c) => {
  const organizationId = c.get('organizationId');

  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!organization) {
    throw new AppError('NOT_FOUND', 'Organization not found', 404);
  }

  return c.json({
    success: true,
    data: organization,
  });
});

// Update organization
org.patch('/me', requireRole('org_admin'), validateBody(updateOrganizationSchema), async (c) => {
  const organizationId = c.get('organizationId');
  const updates = c.get('validatedBody');

  const [updated] = await db
    .update(organizations)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();

  return c.json({
    success: true,
    data: updated,
  });
});

// Update branding
org.patch(
  '/me/branding',
  requireRole('org_admin'),
  validateBody(organizationBrandingSchema),
  async (c) => {
    const organizationId = c.get('organizationId');
    const branding = c.get('validatedBody');

    const [updated] = await db
      .update(organizations)
      .set({
        branding,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))
      .returning();

    return c.json({
      success: true,
      data: updated.branding,
    });
  }
);

// Update settings
org.patch('/me/settings', requireRole('org_admin'), async (c) => {
  const organizationId = c.get('organizationId');
  const settings = await c.req.json();

  const [updated] = await db
    .update(organizations)
    .set({
      settings: settings,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();

  return c.json({
    success: true,
    data: updated.settings,
  });
});

// Update M-Pesa config
org.patch('/me/mpesa', requireRole('org_admin'), async (c) => {
  const organizationId = c.get('organizationId');
  const mpesaConfig = await c.req.json();

  // In production, encrypt these values
  const [updated] = await db
    .update(organizations)
    .set({
      mpesaConfig,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId))
    .returning();

  return c.json({
    success: true,
    data: { message: 'M-Pesa configuration updated' },
  });
});

export default org;
