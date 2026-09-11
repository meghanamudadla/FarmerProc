import { apiRequest } from "./api";

export async function getCenters() {
  return apiRequest("/centers/");
}

export async function createCenter({ name, location, district, capacity }) {
  return apiRequest("/centers/", {
    method: "POST",
    body: JSON.stringify({ name, location, district, capacity }),
  });
}
