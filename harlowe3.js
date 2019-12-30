window.storyFormat({
    "name": "Harlowe3ToJSON",
    "version": "0.0.0",
    "author": "Jonathan Schoonhoven",
    "description": "Convert Harlowe 3 Twine story to JSON.",
    "proofing": false,
    "source": `
<html>
	<head>
        <meta http-equiv='Content-Type' content='text/html; charset=UTF-8' />
		<title>Harlowe To JSON</title>
		<script type='text/javascript'>
/**
* Twine To JSON
*
* Copyright (c) 2020 Jonathan Schoonhoven
*
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
* associated documentation files (the 'Software'), to deal in the Software without restriction,
* including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
* and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
* subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all copies or substantial
* portions of the Software.
*
* THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
* LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
* IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
* WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
* SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

const STORY_TAG_NAME = 'tw-storydata';
const PASSAGE_TAG_NAME = 'tw-passagedata';
const STORY_ATTRIBUTES = ['name', 'creator', 'creator-version', 'format', 'format-version', 'ifid'];
const PASSAGE_ATTRIBUTES = ['name', 'tags', 'pid'];
const REGEX_LINK = /\\[\\[(.*?)\\]\\]/g;
const REGEX_BRACKET = /[{\\[\\]}]/g;
const REGEX_ITALICS = /[{\\/\\/}]/g;
const REGEX_BOLD = /[{\\'\\'}]/g;
const REGEX_STRIKE = /[{\\~\\~}]/g;
const REGEX_EMPHASIS = /[{\\*}]/g;
const REGEX_STRONG = /[{\\*\\*}]/g;
const REGEX_SUPER = /[{\\^\\^}]/g;
const REGEX_MACRO = /\\(([a-zA-Z]+):(.+)\\)/g;
const REGEX_RIGHT_HOOK = /\\[(.+)\\]<(.+)\\|/g;
const REGEX_LEFT_HOOK = /\\|(.+)\>\\[(.+)\\]/g;
const REGEX_ANON_HOOK = /\\s?\\[(.+)\\]/g;


/**
 * Convert Twine story to JSON.
 */
function twineToJSON() {
    const result = {};
    const storyElement = document.getElementsByTagName(STORY_TAG_NAME)[0];
    const storyMeta = getElementAttributes(storyElement);
    STORY_ATTRIBUTES.forEach((attributeName) => {
        result[attributeName] = storyMeta[attributeName];
    });
    const passageElements = Array.from(storyElement.getElementsByTagName(PASSAGE_TAG_NAME));
    result.passages = passageElements.map((passageElement) => {
        return processPassageElement(passageElement);
    });
    return result;
}


/**
 * Convert the HTML element for a story passage to JSON.
 */
function processPassageElement(passageElement) {
    const result = {};
    const passageMeta = getElementAttributes(passageElement);
    PASSAGE_ATTRIBUTES.forEach((attributeName) => {
        result[attributeName] = passageMeta[attributeName];
    });
    const text = passageElement.innerText.trim();
    result.text = text;
    result.links = extractLinks(text);
    result.macros = extractMacros(text);
    result.hooks = extractHooks(text);
    result.cleanText = sanitizeText(text);
    return result;
}


/**
 * Extract link data from the passage text as an object.
 */
function extractLinks(passageText) {
    let matches = passageText.match(REGEX_LINK) || [];
    // remove outer brackets
    matches = matches.map((match) => {
        return match.replace(REGEX_BRACKET, '');
    });
    const links = matches.map((match) => {
        let linkText;
        let passageName;
        // handle forward links
        let split = match.split('->');
        if (split.length === 2) {
            linkText = split[0];
            passageName = split[1];
        }
        // handle backward links
        split = match.split('<-');
        if (split.length === 2) {
            linkText = split[1];
            passageName = split[0];
        }
        // handle shorthand links
        if (!linkText) {
            linkText = match;
            passageName = match;
        }
        return { linkText: linkText.trim(), passageName: passageName.trim() };
    });
    return links;
}


/**
 * Extract macros from passage text as objects.
 */
function extractMacros(passageText) {
    const matches = Array.from(passageText.matchAll(REGEX_MACRO));
    const macros = matches.map((match) => {
        let macroName;
        let macroValue;
        if (match.length === 3) {
            macroName = match[1].trim();
            macroValue = match[2].trim();
        }
        return { macroName: macroName, macroValue: macroValue };
    });
    return macros;
}


/**
 * Extract hooks from passage text as objects.
 */
function extractHooks(passageText) {
    const rightMatches = Array.from(passageText.matchAll(REGEX_RIGHT_HOOK));
    const rightHooks = rightMatches.map((match) => {
        let hookValue;
        let hookName;
        if (match.length === 3) {
            hookValue = match[1].trim();
            hookName = match[2].trim();
        }
        return { hookName: hookName, hookValue: hookValue };
    });
    const leftMatches = Array.from(passageText.matchAll(REGEX_LEFT_HOOK));
    const leftHooks = leftMatches.map((match) => {
        let hookValue;
        let hookName;
        if (match.length === 3) {
            hookName = match[1].trim();
            hookValue = match[2].trim();
        }
        return { hookName: hookName, hookValue: hookValue };
    });
    const hooks = rightHooks.concat(leftHooks);
    const anonMatches = Array.from(passageText.matchAll(REGEX_ANON_HOOK));
    anonMatches.forEach((match) => {
        if (match.length !== 2) {
            return;
        }
        const hookText = match[1];
        if (stringStartsWith(hookText, '[')) {
            return;
        }
        const isDuplicate = hooks.some((hook) => {
            return hook.hookValue === hookText;
        });
        if (!isDuplicate) {
            hooks.push({ hookName: undefined, hookValue: hookText.trim() });
        }
    });
    return hooks.filter(hook => hook.hookValue);
}


/**
 * Remove links, macros, and markup from text.
 */
function sanitizeText(passageText) {
    passageText = passageText.replace(REGEX_LINK, '');
    passageText = passageText.replace(REGEX_ITALICS, '');
    passageText = passageText.replace(REGEX_BOLD, '');
    passageText = passageText.replace(REGEX_STRIKE, '');
    passageText = passageText.replace(REGEX_EMPHASIS, '');
    passageText = passageText.replace(REGEX_STRONG, '');
    passageText = passageText.replace(REGEX_SUPER, '');
    passageText = passageText.replace(REGEX_MACRO, '');
    passageText = passageText.replace(REGEX_RIGHT_HOOK, '');
    passageText = passageText.replace(REGEX_LEFT_HOOK, '');
    passageText = passageText.replace(REGEX_ANON_HOOK, '');
    passageText = passageText.trim();
    return passageText;
}


/**
 * Convert an HTML element to an object of attribute values.
 */
function getElementAttributes(element) {
    const result = {};
    const attributes = Array.from(element.attributes);
    attributes.forEach((attribute) => {
        result[attribute.name] = attribute.value;
    });
    return result;
}


/**
 * True if string starts with the given substring.
 */
function stringStartsWith(string, startswith) {
    return string.trim().substring(0, startswith.length) === startswith;
}
/** END **/
        </script>
	</head>
	<body>
        <pre id='content'></pre>
        <div id='storyData' style='display: none;'>{{STORY_DATA}}</div>
        <script type='text/javascript'>document.getElementById('content').innerHTML = JSON.stringify(twineToJSON(), null, 2);</script>
	</body>
</html>
`
});
