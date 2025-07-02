const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: './backend/.env' });

(async () => {
  const User = (await import("../backend/src/models/User.js")).default;
  const { upsertStreamUser } = await import("../backend/src/lib/stream.js");

  await mongoose.connect(process.env.MONGODB_URI);

  const users = await User.find({});
  for (const user of users) {
    await upsertStreamUser({
      id: user._id.toString(),
      name: user.fullName,
      ...(user.profilePic && !user.profilePic.startsWith('data:') && { image: user.profilePic }),
    });
    console.log(`Upserted user: ${user.fullName}`);
  }

  await mongoose.disconnect();
  console.log("All users upserted to Stream!");
})().catch(console.error); 