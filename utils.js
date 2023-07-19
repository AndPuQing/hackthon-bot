module.exports = class MarkdownTable {
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
        table.headers = headers;
        this.tableline.forEach(rowline => {
            const cells = rowline.split("|").map(cell => cell.trim());
            table.rows.push(cells);
        });
        return table;
    }

    setClaim(id, claim, pr) {
        const row = this.table.rows.find(row => row[this.id_index] == id);
        if (row) {
            const original_claim = row[this.claim_index];
            if (original_claim) {
                row[this.claim_index] = `${original_claim}, @${claim}`;
            }
            else {
                row[this.claim_index] = `@${claim}`;
            }
        } else {
            //TODO: handle this
        }
        if (pr) {
            const original_pr = row[this.pr_index];
            if (original_pr) {
                row[this.pr_index] = `${original_pr}, ${pr}`;
            }
            else {
                row[this.pr_index] = `${pr}`;
            }
        }
    }

    toMarkdown() {
        let i = 0;
        this.lines.forEach((line, index) => {
            if (line.startsWith("|")) {
                this.lines[index] = this.table.rows[i].join("|");
                i++;
            }
        }
        );
        return this.lines.join("\n");
    }
}