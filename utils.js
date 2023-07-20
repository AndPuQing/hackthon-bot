class MarkdownTable {
    constructor(markdownText) {
        this.markdownText = markdownText;
        this.lines = markdownText.split('\n');
        this.tableline = this.lines.filter(line => line.startsWith("|"));
        this.table = this._createTable();
        this.id_index = this.table.headers.indexOf("编号"); //TODO: make this configurable
        this.claim_index = this.table.headers.indexOf("认领人"); //TODO: make this configurable
        this.pr_index = this.table.headers.indexOf("PR链接"); //TODO: make this configurable
        if (this.table.rows.length != this.tableline.length) {
            throw new Error("Table line count does not match table row count");
        }
    }

    _createTable() {
        const table = {
            headers: [],
            rows: []
        };
        const headerline = this.tableline;
        const headers = headerline[0].split("|").map(cell => cell.trim());
        headers.shift();
        headers.pop();
        table.headers = headers;
        this.tableline.forEach(rowline => {
            const cells = rowline.split("|").map(cell => cell.trim());
            cells.shift();
            cells.pop();
            table.rows.push(cells);
        });
        return table;
    }

    setClaim(id, claim, pr) {
        const row = this.table.rows.find(row => row[this.id_index] == id);
        if (!row) {
            throw new Error(`ID ${id} not found`);
        }
        if (!row[this.claim_index]?.includes(claim)) {
            row[this.claim_index] = [row[this.claim_index], `@${claim}`].filter(Boolean).join(", ");
        }
        if (pr) {
            row[this.pr_index] = [row[this.pr_index], pr].filter(Boolean).join(", ");
        }
    }

    toMarkdown() {
        let i = 0;
        this.lines.forEach((line, index) => {
            if (line.startsWith("|")) {
                this.lines[index] = `| ${this.table.rows[i].join(" | ")} |`
                i++;
            }
        }
        );
        return this.lines.join("\n");
    }

    matchID(pr_title) {
        const id_regex = /No\.(\d+)/g;
        const match = id_regex.exec(pr_title);
        if (match) {
            const id = match[1];
            const row = this.table.rows.find(row => row[this.id_index] == id);
            if (row) {
                return id;
            }
        }
        const len = this.table.headers.length;
        for (let i = 0; i < len; i++) {
            if (i == this.id_index || i == this.claim_index || i == this.pr_index) {
                continue;
            }
            const row = this.table.rows.find(row => pr_title.includes(row[i]));
            if (row) {
                return row[this.id_index];
            }
        }
        return null;
    }
}

function _convertIssueIDToURL(id) {
    return `https://github.com/{owner}/{repo}/issues/${id}`;
}

function getIssueURLFromText(text) {
    const regex = /https:\/\/github.com\/(\w+)\/(\w+)\/issues\/(\d+)/g;
    const matches = [];
    let match;
    while ((match = regex.exec(text)) !== null) {
        matches.push(match[0]);
    }
    const issue_regex = /#(\d+)/g;
    while ((match = issue_regex.exec(text)) !== null) {
        matches.push(_convertIssueIDToURL(match[1]));
    }
    if (matches.length > 0) {
        return matches;
    }
    return null;
}


module.exports = {
    MarkdownTable,
    getIssueURLFromText,
};