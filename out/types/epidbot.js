"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSnippetResult = isSnippetResult;
function isSnippetResult(r) {
    return r.source_type === 'snippet' && r.title !== undefined && r.source_code !== undefined;
}
//# sourceMappingURL=epidbot.js.map