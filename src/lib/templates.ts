// Template Server Actions
'use server';

import { prisma } from "@/lib/prisma";

export async function saveTemplate(userId: string, subject: string, html: string) {
  try {
    const existingTemplate = await prisma.template.findFirst({
      where: {
        subject: subject,
        userId: userId,
      },
    });

    let savedTemplate;
    if (existingTemplate) {
      savedTemplate = await prisma.template.update({
        where: { id: existingTemplate.id },
        data: { html },
      });
    } else {
      savedTemplate = await prisma.template.create({
        data: {
          subject,
          html,
          userId,
        },
      });
    }
    return { success: true, template: savedTemplate };
  } catch (error) {
    console.error('Error saving template:', error);
    return { success: false, error: 'Failed to save template' };
  }
}

export async function deleteTemplate(userId: string, templateId: string) {
  try {
    const deletedTemplate = await prisma.template.deleteMany({
      where: {
        id: templateId,
        userId: userId,
      },
    });

    if (deletedTemplate.count === 0) {
      return { success: false, error: 'Template not found or not authorized' };
    }

    return { success: true, message: 'Template deleted successfully' };
  } catch (error) {
    console.error('Error deleting template:', error);
    return { success: false, error: 'Failed to delete template' };
  }
}

export async function fetchTemplates(userId: string) {
  try {
    const templates = await prisma.template.findMany({
      where: {
        userId: userId,
      },
    });
    return { success: true, templates };
  } catch (error) {
    console.error('Error fetching templates:', error);
    return { success: false, error: 'Failed to fetch templates', templates: [] };
  }
}