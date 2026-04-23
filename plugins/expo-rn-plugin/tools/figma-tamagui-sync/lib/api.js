export async function fetchVariables(fileId, token) {
  const url = `https://api.figma.com/v1/files/${fileId}/variables/local`;
  const res = await fetch(url, { headers: { "X-Figma-Token": token } });
  const body = await res.json();

  if (!res.ok) {
    const msg = body.message || JSON.stringify(body);
    if (res.status === 403 && msg.includes("file_variables")) {
      throw new Error(
        "Figma Variables API requires a paid plan (Professional or higher).\n" +
        "Upgrade your Figma account to enable token sync.\n" +
        `Details: ${msg}`
      );
    }
    throw new Error(`Figma API error ${res.status}: ${msg}`);
  }

  return body;
}
