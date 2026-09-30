const User = require("../models/User");

function slugifyName(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return base || "user";
}

async function generateUniqueUsername(name) {
  const base = slugifyName(name);
  let candidate = base;
  let suffix = 0;

  while (await User.exists({ username: candidate })) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }

  return candidate;
}

module.exports = { generateUniqueUsername, slugifyName };
