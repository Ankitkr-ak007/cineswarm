import createClient from "openapi-fetch";
import type { paths } from "./api-types";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const apiClient = createClient<paths>({ baseUrl: backendUrl });
