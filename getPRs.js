// Make script run locally
const fetch = require('cross-fetch');

const inputData = { // https://zapier.com/help/code/#data-variables
  githubAPIToken: '<TOKEN>',
  labels: '<LABEL 1>, <LABEL 2>, <LABEL N>', // Case-insensitive
  repos: '<REPO 1>, <REPO 2>, <REPO N>'
};

const callback = (err, output) => { // https://zapier.com/help/code/#utilities
  if (err) { console.log(`error: (${typeof err}) ${err} \nstringified error: ${JSON.stringify(err)}`); }
  if (output) { console.log(`success: (${typeof output}) ${output} \nstringified output: ${JSON.stringify(output)}`); }
};

// Copy to Zapier from here:
const { githubAPIToken } = inputData;
let { labels: labelNames, repos } = inputData;
labelNames = labelNames.split(',').map(l => l.trim());
repos = repos.split(',').map(r => r.trim());

const fetchLabels = async (repository) => {
  const query = `
    query {
      repository(owner: "Teespring", name: "${repository}") {
        pullRequests(last: 100, labels: ${JSON.stringify(labelNames)}, states: OPEN) {
          nodes {
            title
            state
            number
            url
            labels(first: 10) {
              nodes {
                name
              }
            }
          }
        }
      }
    }`;

  return fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${githubAPIToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query
    })
  });
};

const checkStatus = (response) => {
  if (response.ok) {
    return response;
  }
  return response.json().then(((err) => {
    throw err;
  }));
};

const parseJSON = (response) => {
  return Promise.resolve(response.json());
};

const mergePRArrays = (responses) => {
  const concat = (x, y) => x.concat(y);
  const flatMap = (f, xs) => xs.map(f).reduce(concat, []);

  return flatMap(x => x.data.repository.pullRequests.nodes, responses);
};

// GitHub can only OR a set of labels, this makes sure only PRs that
// include ALL labels are matched.
const onlyPrsWithLabels = (labels) => {
  return (prsIn) => {
    return prsIn.filter((pr) => {
      const allLabels = pr.labels.nodes.map(labelNode => labelNode.name.toLowerCase());
      return labels.every(l => allLabels.includes(l.toLowerCase()));
    }).filter((prA, idxA, prs) => {
      const idxB = prs.findIndex(prB => prB.number === prA.number);
      return idxA === idxB;
    });
  };
};

Promise.all(repos.map((r) => {
  return fetchLabels(r)
    .then(checkStatus)
    .then(parseJSON);
}))
  .then(mergePRArrays)
  .then(onlyPrsWithLabels(labelNames))
  .then(res => callback(undefined, res))
  .catch(err => callback(err, undefined));
