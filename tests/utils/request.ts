export const JSONRequest = (endpoint: string, body: object) => {
  return new Request(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
};

export const formDataRequest = (endpoint: string, body: object) => {
  const formData = new FormData();

  Object.entries(body).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return new Request(endpoint, {
    method: 'POST',
    body: formData,
  });
};
