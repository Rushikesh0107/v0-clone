"use server";

import db from "@/lib/db";
import { currentUser } from "@clerk/nextjs/server";

export const onBoardUser = async () => {
  try {
    const user = await currentUser();

    if (!user) {
      return {
        success: false,
        error: "No authenticated user found",
      };
    }

    const { id, firstName, lastName, imageUrl, emailAddresses } = user;

    const newUser = await db.user.upsert({
      where: {
        clerkId: id,
      },
      update: {
        name:
          firstName && lastName
            ? `${firstName} ${lastName}`
            : firstName || lastName || null,
        email: emailAddresses[0].emailAddress || "",
        image: imageUrl,
      },
      create: {
        clerkId: id,
        name:
          firstName && lastName
            ? `${firstName} ${lastName}`
            : firstName || lastName || null,
        email: emailAddresses[0].emailAddress || "",
        image: imageUrl,
      },
    });

    if (!newUser) {
      return {
        success: false,
        error: "Something went wrong while creating user",
      };
    }

    return {
      success: true,
      user: newUser,
      message: "User onboarded succesfully",
    };
  } catch (error) {
    console.error("Error onborading user", error);
    return {
      success: false,
      error: "Failed to onboard user",
    };
  }
};

export const getCurrentUser = async () => {
  try {
    const user = await currentUser();

    if(!user){
      return null
    }

    const dbUser = await db.user.findUnique({
      where: {
        clerkId : user.id
      },
      select : {
        id : true,
        email : true,
        name : true,
        image : true,
        clerkId : true
      }
    })

    if(!dbUser) {
      return null;
    }

    return {
      success : true,
      user : dbUser,
    }

  } catch (error) {
    console.error("Something went wrong while finding user", error)
    return null;
  }
};
