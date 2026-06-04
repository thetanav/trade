export async function api<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const data = await res.json();
  return data;
}
