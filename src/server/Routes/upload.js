import { Router } from "express";

export default Router().get("/:id", (req, res) => res.status(200).sendFile(`${process.cwd()}/src/server/uploads/${req.params.id}`))