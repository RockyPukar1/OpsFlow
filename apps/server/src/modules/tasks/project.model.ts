import mongoose, { Document, Schema } from "mongoose";

export interface IProject extends Document {
  name: string;
  description?: string;
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minLength: 3,
    },
    description: {
      type: String,
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for performance
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ members: 1, status: 1 });

// Method to check if user is member or owner
projectSchema.methods.hasAccess = function (userId: string): boolean {
  return (
    this.owner.toString() === userId ||
    this.members.some((member: string) => member.toString() === userId)
  );
};

// Method to check if user is owner
projectSchema.methods.isOwner = function (userId: string): boolean {
  return this.owner.toString() === userId;
};

export const Project = mongoose.model<IProject>("Project", projectSchema);
