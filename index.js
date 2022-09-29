export default {
  async fetch(request, env) {

    const url = new URL(request.url);
    const key = url.pathname.slice(1);

    if (!authorizeRequest(request, env, key)) {
      return new Response('Forbidden', { status: 403 });
    }

    switch (request.method) {
      case 'PUT':

        var reqJSON = await request.json();

        await env.MY_BUCKET.put(key, reqJSON['data']);
        return new Response(`Put ${key} successfully!`);

      case 'GET':
        const object = await env.MY_BUCKET.get(key);

        if (object === null) {
          return new Response('Object Not Found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);

        const dataToReturn = await object.text();

        return new Response(dataToReturn, {
          headers,
        });

      case 'DELETE':
        await env.MY_BUCKET.delete(key);
        return new Response('Deleted!');

      default:
        return new Response('Method Not Allowed', {
          status: 405,
          headers: {
            Allow: 'PUT, GET, DELETE',
          },
        });
    }
  },
};

const PRESHARED_AUTH_HEADER_KEY = 'X-Custom-SAK';
const PRESHARED_AUTH_HEADER_VALUE = 'super.octupus.friend';

async function handleRequest(request) {
  const psk = request.headers.get(PRESHARED_AUTH_HEADER_KEY);

  if (psk === PRESHARED_AUTH_HEADER_VALUE) {
    // Correct preshared header key supplied. Fetch request from origin.
    return fetch(request);
  }

  // Incorrect key supplied. Reject the request.
  return new Response('Sorry, you have supplied an invalid key.', {
    status: 403,
  });
}

const hasValidHeader = (request, env) => {
  return request.headers.get('X-Custom-SAK') === env.AUTH_KEY_SECRET;
};

function authorizeRequest(request, env, key) {
  switch (request.method) {
    case 'PUT':
    case 'DELETE':
      return hasValidHeader(request, env);
    case 'GET':
      return true;
    default:
      return false;
  }
}
