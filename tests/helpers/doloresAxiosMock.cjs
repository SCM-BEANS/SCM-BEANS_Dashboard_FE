function createDoloresAxiosMock(responses = []) {
  const calls = [];

  function record(method, url, data, config, hasData) {
    const requestConfig = { method, url, ...(config ?? {}) };
    if (hasData) requestConfig.data = data;
    calls.push({ config: requestConfig });
    return Promise.resolve({ data: responses.shift() });
  }

  return {
    calls,
    module: {
      doloresAxiosClient: {
        get: (url, config) => record('GET', url, undefined, config, false),
        post(url, data, config) {
          return record('POST', url, data, config, arguments.length >= 2);
        },
      },
      parseDoloresResponse: (data, schema) => schema.parse(data),
    },
  };
}

module.exports = { createDoloresAxiosMock };
