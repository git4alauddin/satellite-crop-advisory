import dotenv from "dotenv";
import app from "./app.js";

dotenv.config();

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
