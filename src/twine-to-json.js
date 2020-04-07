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
const FORMAT_TWINE = 'twine';
const FORMAT_HARLOWE_3 = 'harlowe-3';
const VALID_FORMATS = [FORMAT_TWINE, FORMAT_HARLOWE_3];


/**
 * Convert Twine story to JSON.
 */
function twineToJSON(format) {
    const storyElement = document.getElementsByTagName(STORY_TAG_NAME)[0];
    const storyMeta = getElementAttributes(storyElement);
    const result = {
        uuid: storyMeta.ifid,
        name: storyMeta.name,
        creator: storyMeta.creator,
        creatorVersion: storyMeta['creator-version'],
        schemaName: storyMeta.format,
        schemaVersion: storyMeta['format-version'],
        createdAtMs: Date.now(),
    };
    validate(format);
    const passageElements = Array.from(storyElement.getElementsByTagName(PASSAGE_TAG_NAME));
    result.passages = passageElements.map((passageElement) => {
        return processPassageElement(passageElement, format);
    });
    return result;
}


/**
 * Validate story and inputs. Currently this only validates the format arg. TODO: make this more robust.
 */
function validate(format) {
    const isValidFormat = VALID_FORMATS.some(validFormat => validFormat === format);
    if (!isValidFormat) {
        throw new Error('Format is not valid.');
    }
}


/**
 * Convert the HTML element for a story passage to JSON.
 */
function processPassageElement(passageElement, format) {
    const passageMeta = getElementAttributes(passageElement);
    const result = {
        name: passageMeta.name,
        tags: passageMeta.tags,
        id: passageMeta.pid,
    };
    result.text = passageElement.innerText.trim();
    Object.assign(result, processPassageText(result.text, format));
    result.cleanText = sanitizeText(result.text, result.links, result.hooks, format);
    return result;
}


function processPassageText(passageText, format) {
    const result = { links: [] };
    if (format === FORMAT_HARLOWE_3) {
        result.hooks = [];
    }
    let currentIndex = 0;
    while (currentIndex < passageText.length) {
        const maybeLink = extractLinksAtIndex(passageText, currentIndex);
        if (maybeLink) {
            result.links.push(maybeLink);
            currentIndex += maybeLink.original.length;
        }
        if (format !== FORMAT_HARLOWE_3) {
            currentIndex += 1;
            continue;
        }
        const maybeLeftHook = extractLeftHooksAtIndex(passageText, currentIndex);
        if (maybeLeftHook) {
            result.hooks.push(maybeLeftHook);
            currentIndex += maybeLeftHook.original.length;
        }
        currentIndex += 1;
        const maybeHook = extractHooksAtIndex(passageText, currentIndex);
        if (maybeHook) {
            result.hooks.push(maybeHook);
            currentIndex += maybeHook.original.length;
        }
    }
    return result;
}


function extractLinksAtIndex(passageText, currentIndex) {
    const currentChar = passageText[currentIndex];
    const nextChar = passageText[currentIndex + 1];
    if (currentChar === '[' && nextChar === '[') {
        const link = getSubstringBetweenBrackets(passageText, currentIndex + 1);
        const leftSplit = link.split('<-', 2);
        const rightSplit = link.split('->', 2);
        const original = passageText.substring(currentIndex, currentIndex + link.length + 4);
        if (leftSplit.length === 2) {
            return { linkText: leftSplit[1].trim(), passageName: leftSplit[0].trim(), original: original };
        }
        else if (rightSplit.length === 2) {
            return { linkText: rightSplit[0].trim(), passageName: rightSplit[1].trim(), original: original };
        }
        else {
            return { linkText: link.trim(), passageName: link.trim(), original: original };
        }
    }
}


function extractLeftHooksAtIndex(passageText, currentIndex) {
    const regexAlphaNum = /[a-z0-9]+/i;
    const currentChar = passageText[currentIndex];
    if (currentChar === '|') {
        const maybeHookName = getSubstringBetweenBrackets(passageText, currentIndex, '|', '>');
        if (maybeHookName.match(regexAlphaNum)) {
            const hookStartIndex = currentIndex + maybeHookName.length + 2; // advance to next char after ">"
            const hookStartChar = passageText[hookStartIndex];
            if (hookStartChar === '[') {
                const hookText = getSubstringBetweenBrackets(passageText, hookStartIndex);
                const hookEndIndex = hookStartIndex + hookText.length + 2;
                const original = passageText.substring(currentIndex, hookEndIndex);
                return { hookName: maybeHookName, hookText: hookText, original: original };
            }
        }
    }
}


function extractHooksAtIndex(passageText, currentIndex) {
    const regexAlphaNum = /[a-z0-9]+/i;
    const currentChar = passageText[currentIndex];
    const nextChar = passageText[currentIndex + 1];
    const prevChar = currentIndex && passageText[currentIndex - 1];
    if (currentChar === '[' && nextChar !== '[' && prevChar !== '[') {
        const hookText = getSubstringBetweenBrackets(passageText, currentIndex);
        const hookEndIndex = currentIndex + hookText.length + 2;
        const hookEndChar = passageText[hookEndIndex];
        if (hookEndChar === '<') {
            const maybeHookName = getSubstringBetweenBrackets(passageText, hookEndIndex, '<', '|');
            if (maybeHookName.match(regexAlphaNum)) {
                const original = passageText.substring(currentIndex, hookEndIndex + maybeHookName.length + 2);
                return { hookName: maybeHookName, hookText: hookText, original: original };
            }
        }
        const original = passageText.substring(currentIndex, hookText.length + 2);
        return { hookName: undefined, hookText: hookText, original: original };
    }
}


function sanitizeText(passageText, links, hooks, format) {
    links.forEach((link) => {
        passageText = passageText.replace(link.original, '');
    });
    if (format === FORMAT_HARLOWE_3) {
        hooks.forEach((hook) => {
            passageText = passageText.replace(hook.original, '');
        });
    }
    return passageText.trim();
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


function getSubstringBetweenBrackets(string, startIndex, openBracket, closeBracket) {
    openBracket = openBracket || '[';
    closeBracket = closeBracket || ']';
    const bracketStack = [];
    let currentIndex = startIndex || 0;
    let substring = '';
    if (string[currentIndex] !== openBracket) {
        throw new Error('startIndex of getSubstringBetweenBrackets must correspond to an open bracket');
    }
    while (currentIndex < string.length) {
        const currentChar = string[currentIndex];
        // pull top bracket from stack if we hit a close bracket
        if (currentChar === closeBracket) {
            bracketStack.pop();
        }
        // build substring so long as stack is populated
        if (bracketStack.length) {
            substring += currentChar;
        }
        // add open brackets to the top of the stack
        if (currentChar === openBracket) {
            bracketStack.push(currentChar);
        }
        // return if stack is empty and substring is set
        if (!bracketStack.length) {
            return substring;
        }
        currentIndex += 1;
    }
    return substring;
}
