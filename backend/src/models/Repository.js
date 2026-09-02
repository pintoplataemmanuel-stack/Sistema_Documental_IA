const mongoose = require("mongoose");

const repositorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre del repositorio es requerido"],
      trim: true,
      minlength: 1,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Repository", repositorySchema);
