export const generateId = (source: string) => {
  const parsedUrl = new URL(source);

  // Remove the protocol
  const hostname = parsedUrl.hostname;
  const pathname = parsedUrl.pathname;
  const search = parsedUrl.search || '';

  // Get the first query parameter
  const queryParams = new URLSearchParams(search);
  const firstParam = queryParams.entries().next().value;

  let idString = `${hostname}${pathname}`;
  if (firstParam) {
    idString += `?${firstParam[0]}=${firstParam[1]}`;
  }

  return Buffer.from(idString).toString('base64url');
};

export const getSourceFromId = (id: string) => {
  id = id.replace(/%(?:3D|2[BF])/g, char => {
    switch (char) {
      case '%2B':
        return '-'
      case '%2F':
        return '_'
      default:
        return ''
    }
  });
  const decoded = Buffer.from(id, 'base64url').toString('utf8');

  return `https://${decoded}`;
};
