# Twine-to-JSON

A story format for converting a Twine 2 story to JSON with special support for Harlowe 3.x.

Twine-to-JSON is inspired by [Twison](https://github.com/lazerwalker/twison), which in turn was inspired by [Entweedle](http://www.maximumverbosity.net/twine/Entweedle/).


## Setup

From the Twine 2 homescreen, select `Formats` and then `Add a New Format`. At the prompt, paste in one of the addresses below:

For vanilla Twine-to-JSON (without special support for Harlowe 3.x), use this address:

```
https://jtschoonhoven.github.io/twine-to-json/dist/twine.js
```

For Harlowe-flavored Twine-to-JSON, use this address:

```
https://jtschoonhoven.github.io/twine-to-json/dist/harlowe-3.js
```

If you're not sure which one you should use then go with the Harlowe-flavored version. It has everything the vanilla flavor has, plus a little extra.


## Export

Once you've installed format, enter your story and choose `Change Story Format`. Select the new format and return to your story. Selecting `Play` will export a JSON file.

From within your story, set the story format to Twison. Choosing "Play" will now give you a JSON file.


## Example Output

```json
{
  "name": "GeoTest",
  "creator": "Twine",
  "creator-version": "2.3.5",
  "format": "Harlowe 3 to JSON",
  "format-version": "0.0.3",
  "ifid": "A0472E68-7822-4211-9F11-5CBD919162DC",
  "passages": [
    {
      "name": "StoryStart",
      "tags": "",
      "pid": "1",
      "text": "Once upon a time there was a sheep.\n[[Pet the sheep -> PetSheep]]",
      "links": [
        {
          "linkText": "Pet the sheep",
          "passageName": "PetSheep",
          "original": "[[Pet the sheep -> PetSheep]]"
        }
      ],
      "hooks": [],
      "cleanText": "Once upon a time there was a sheep."
    },
    {
      "name": " PetSheep",
      "tags": "",
      "pid": "2",
      "text": "You pet the sheep. The end.",
      "links": [],
      "hooks": [],
      "cleanText": "You pet the sheep. The end."
    }
  ]
}
```


## Why use Twine-to-JSON instead of Twison (et al)?

You should probably use Twison. Twine-to-JSON currently has an unstable API and is less well tested. However, if Twison isn't working for you, you may have better luck with Twine-to-JSON. This project uses a more reliable method of detecting links and won't be fooled by embeded json arrays. It also detects some features specific to Harlowe.


## Contributing

Please do.
