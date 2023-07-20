/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  const { MarkdownTable, getIssueURLFromText } = require("./utils");

  var TrackingIssue = []; // cache tracking issue urls

  app.log.info("Yay, the app was loaded!");

  app.on("issues.opened", async (context) => {
    issue_title = context.payload.issue.title;
    if (issue_title.includes("Tracking Issue")) {
      TrackingIssue.push(context.payload.issue.url);
    }
  });

  app.on(["pull_request.opened", "pull_request.edited"], async (context) => {
    const pr = context.payload.pull_request;
    const pr_title = pr.title;
    const repo = context.payload.repository.name;
    const owner = context.payload.repository.owner.login;
    let body = pr.body;
    const issue_urls = getIssueURLFromText(body); // get issue urls from pr body
    const filtered_issue_urls = issue_urls
      .map((issue_url) => issue_url.replace("{owner}", owner).replace("{repo}", repo))
      .filter((issue_url) => TrackingIssue.includes(issue_url)); // filter out non-tracking issue urls

    const issues = filtered_issue_urls.length > 0 ? filtered_issue_urls : TrackingIssue; // if no issue urls found, use tracking issue urls

    await Promise.all(
      issues.map(async (issue_url) => {
        app.log.info(`issue_url: ${issue_url}`);
        const [_, __, ___, owner, repo, ____, issue_number] = issue_url.split("/");
        app.log.info(`owner: ${owner}, repo: ${repo}, issue_number: ${issue_number}`);
        const { data: issue } = await context.octokit.issues.get({
          owner,
          repo,
          issue_number,
        });
        if (issue.body == "") {
          return;
        }
        const table = new MarkdownTable(issue.body);
        const id = table.matchID(pr_title);
        if (id) {
          const claimer = pr.user.login;
          table.setClaim(id, claimer, pr.html_url);
          const newBody = table.toMarkdown();
          return context.octokit.issues.update({
            owner,
            repo,
            issue_number,
            body: newBody,
          });
        } else {
          //TODO: handle this case
        }
      })
    );
  });

  app.on("issue_comment.created", async (context) => {
    const sender_type = context.payload.sender.type;
    const comment = context.payload.comment.body;

    if (sender_type == "Bot") {
      return; // Ignore bot comments
    }
    const issue = context.payload.issue;

    const regex = /^\/claim\s+((\d+(-\d+)?|\d+-\d+)(,\s*(\d+(-\d+)?|\d+-\d+))*)(?=\s|$)/;
    const match = regex.exec(comment);
    if (match) {
      var table = new MarkdownTable(issue.body);

      if (table.tableline.length == 0) {
        return;
      }

      if (!TrackingIssue.includes(issue.html_url))
        TrackingIssue.push(issue.html_url);

      const claimer = context.payload.comment.user.login;
      const ids = match[1].split(",").map((id) => id.trim());
      ids.forEach((id) => {
        if (id.includes("-")) {
          const [start, end] = id.split("-");
          for (let i = parseInt(start); i <= parseInt(end); i++) {
            table.setClaim(i, claimer, null);
          }
        } else {
          table.setClaim(id, claimer, null);
        }
      });
      const newBody = table.toMarkdown();
      if (newBody != issue.body) {
        return context.octokit.issues.update({
          owner: context.payload.repository.owner.login,
          repo: context.payload.repository.name,
          issue_number: issue.number,
          body: newBody,
        });
      }
    }
  });
};