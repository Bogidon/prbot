// Make script run locally
const fetch = require('cross-fetch');

const inputData = { // https://zapier.com/help/code/#data-variables
  githubAPIToken: '<TOKEN>',
  labels: '<LABEL 1>, <LABEL 2>, <LABEL N>', // Case-insensitive
  repos: '<REPO 1>, <REPO 2>, <REPO N>',
  owner: '<GITHUB_OWNER_USERNAME>'
};

const callback = (err, output) => { // https://zapier.com/help/code/#utilities
  if (err) { console.log(`error: (${typeof err}) ${err} \nstringified error: ${JSON.stringify(err)}`); }
  if (output) { console.log(`success: (${typeof output}) ${output} \nstringified output: ${JSON.stringify(output)}`); }
};

// Copy to Zapier from here:
const { githubAPIToken, owner } = inputData;
let { labels: labelNames, excludeLabels: excludeLabelNames, repos } = inputData;
repos = repos.split(',').map(r => r.trim());

const importLabels = labelString => (labelString || '').split(',').map(l => l.trim()).filter(s => s.length > 0);
labelNames = importLabels(labelNames);
excludeLabelNames = importLabels(excludeLabelNames);

const fetchPullRequests = async (repository) => {
  const query = `
    query {
      repository(owner: "${owner}", name: "${repository}") {
        pullRequests(last: 100, labels: ${labelNames.length > 0 ? JSON.stringify(labelNames) : null}, states: OPEN) {
          nodes {
            title
            state
            number
            url
            isDraft
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
      Accept: 'application/json, application/vnd.github.shadow-cat-preview+json', // Shadow-cat-preview allows getting draft PRs while in beta
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

const removeDraftPRs = (prsIn) => {
  return prsIn.filter(pr => pr.isDraft !== true);
};

// GitHub can only OR a set of labels, this makes sure only PRs that
// include ALL labels are matched.
const onlyPrsWithLabels = (labels = []) => {
  return (prsIn) => {
    if (labels.length === 0) {
      return prsIn;
    }
    return prsIn.filter((pr) => {
      // The AND condition
      const prLabels = pr.labels.nodes.map(labelNode => labelNode.name.toLowerCase());
      return labels.every(l => prLabels.includes(l.toLowerCase()));
    }).filter((prA, idxA, prs) => {
      const idxB = prs.findIndex(prB => prB.number === prA.number);
      return idxA === idxB;
    });
  };
};

const excludePRsWithLabels = (excludeLabels = []) => {
  return (prsIn) => {
    if (excludeLabels.length === 0) {
      return prsIn;
    }
    return prsIn.filter((pr) => {
      const prLabels = pr.labels.nodes.map(labelNode => labelNode.name.toLowerCase());
      return !excludeLabels.some(l => prLabels.includes(l.toLowerCase()));
    });
  };
};

Promise.all(repos.map((r) => {
  return fetchPullRequests(r)
    .then(checkStatus)
    .then(parseJSON);
}))
  .then(mergePRArrays)
  .then(removeDraftPRs)
  .then(onlyPrsWithLabels(labelNames))
  .then(excludePRsWithLabels(excludeLabelNames))
  .then(res => callback(undefined, res))
  .catch(err => callback(err, undefined));
