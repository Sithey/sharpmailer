"use server";

import { SMTP } from "@prisma/client";
import { prisma } from "./prisma";
import { encrypt } from "./crypto";

interface SMTPResponse {
  success: boolean;
  error?: string;
  smtp?: SMTP;
}

interface SMTPsResponse {
  success: boolean;
  error?: string;
  smtps?: SMTP[];
}

export async function addSMTP(userId: string, smtp: Partial<SMTP>): Promise<SMTPResponse> {
  try {
    const existingSMTP = await prisma.sMTP.findFirst({
      where: {
        host: smtp.host!,
        username: smtp.username!,
        userId,
      },
    });

    const hashedPassword = encrypt(smtp.password!);

    let savedSMTP;
    if (existingSMTP) {
      savedSMTP = await prisma.sMTP.update({
        where: { id: existingSMTP.id },
        data: {
          port: smtp.port!,
          password: hashedPassword,
          secure: smtp.secure!,
          from: smtp.from!,
        },
      });
    } else {
      savedSMTP = await prisma.sMTP.create({
        data: {
          host: smtp.host!,
          port: smtp.port!,
          username: smtp.username!,
          password: hashedPassword,
          secure: smtp.secure!,
          from: smtp.from!,
          userId,
        },
      });
    }

    return {
      success: true,
      smtp: savedSMTP,
    };
  } catch (error) {
    console.error("Error adding SMTP:", error);
    return {
      success: false,
      error: "Failed to add SMTP",
    };
  }
}

export async function fetchSMTPs(userId: string): Promise<SMTPsResponse> {
  try {
    const smtps = await prisma.sMTP.findMany({
      where: {
        userId,
      },
    });

    return {
      success: true,
      smtps,
    };
  } catch (error) {
    console.error("Error fetching SMTPs:", error);
    return {
      success: false,
      error: "Failed to fetch SMTPs",
      smtps: [],
    };
  }
}

export async function deleteSMTP(id: string): Promise<SMTPResponse> {
  try {
    await prisma.sMTP.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting SMTP:", error);
    return {
      success: false,
      error: "Failed to delete SMTP",
    };
  }
}