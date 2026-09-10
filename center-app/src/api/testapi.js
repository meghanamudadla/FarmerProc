import { apiRequest } from "./api";

export async function testBackend() {
  return apiRequest("/");
}