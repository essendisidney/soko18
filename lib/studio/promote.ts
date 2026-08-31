export function profileCanPromote(status: string | null | undefined) {
  return status === "live";
}
