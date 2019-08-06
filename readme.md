# Zapier-GitHub-Slack "PRbot"

- queries GitHub API for PRs maked with provided labels.
- feeds output to Zapier to be sent to Slack as bot.
- at Teespring we use it to make sure we don't lose PRs:

![usage example](images/usage_example.png)

### Running locally

1. `npm install`
1. `node getPRs.js`

### Copying to Zapier

See [getPRs.js](getPRs.js)

### Input Data

Provided as zapier input variables, or in the top of getPRs.js

- `githubAPIToken`
- `labels`: comma-separated list of PR labels. For a PR to be sent to Slack it must match ALL the labels
- `repos`: comma-separated list of repos to check for PRs

|like this|
|-|
|![screenshot of Zapier input variables](images/zapier_input_example.png)|
