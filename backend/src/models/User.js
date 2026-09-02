const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre es requerido"],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, "El correo es requerido"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Formato de correo inválido",
      ],
    },
    password: {
      type: String,
      required: [true, "La contraseña es requerida"],
      minlength: [8, "La contraseña debe tener al menos 8 caracteres"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "editor", "lector"],
      default: "editor",
    },
    company: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Hash de contraseña antes de guardar
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Método para comparar contraseña
userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
