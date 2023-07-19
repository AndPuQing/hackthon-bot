/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
module.exports = (app) => {
  const MarkdownTable = require("./utils");
  app.log.info("Yay, the app was loaded!");

  app.on("issue_comment.created", async (context) => {
    const sender_type = context.payload.sender.type;
    const comment = context.payload.comment.body;

    if (sender_type == "Bot") {
      return; // Ignore bot comments
    }

    const issue = context.payload.issue;
    var table = new MarkdownTable(issue.body);

    const regex = /^\/claim\s+((\d+(-\d+)?|\d+-\d+)(,\s*(\d+(-\d+)?|\d+-\d+))*)(?=\s|$)/;
    const match = regex.exec(comment);
    if (match) {
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
