Create an animation using canvas, similar how the matrix animation feature is implemented in the /matrix directory of this project.

The rectangle of this canvas should fill the width of the feature-category div. The height should be approximately 60 pixels. Similar to martix animation, properties should be configurable in the settings file. The height, width, background color, text color light, text color dark, and speed of the animation as well as array of text strings to be rendered should come from settings.

The animation starts with whole animation area filled with random alphanumeric characters filling the entire screen and each character randomly changing value and color. After fixed time (configurable in settings), the animation coninues but the words from the words array starting to become more and more obvious as they are rendered. First word renders first closer to the left side of the screen. After this first word is rendered, the second, then the thirds and so on.

Rendering of workds should be done by using the color of the characters on the screen. The word is not simply spelled out using characters but instead it is rendered as an art that uses those small characters to form a larger size word, like a pixel art.

Initially use the following words in the settings: ["Request", "Response", "Assertions", "Report"]

Use similar color combinations for characters like in the matrix animation in the /matrix directory. Unline the matrix animation which uses only 1 and 0 characters, this animation will use random alphanumeric characters. The speed of the animation should be configurable in the settings. The intervals between rendering each word should also be configurable, with initial value of 1 second.

Just like in matrix animation it should be created in such a way that it can be started and stopped using a function call. Also clicking on the animation area should stop/restart animation. 

After all the words are rendered the animation will either stop or start over. This is controlled in the settings using loop_animation parameter. This parameter will have numeric value indicating how many times to loop through the words before stopping. If this parameter is negative value then loop infinitely.

Let me know if the height of the canvas should have a minimun size to accomodate the rendering of words.
 ASCII art generator can be used to generate.

 You may suggest any improvement.
 You may suggest using any well known external javascript library that will be helpful for this task but ideally I prefer to now rely on external libraries and have everything self contained in the code. 