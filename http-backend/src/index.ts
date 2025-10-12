import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.get("/api/v1", (req, res) => {
    res.json({ message: "Hello World" });
});

app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
