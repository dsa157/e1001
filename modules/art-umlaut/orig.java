PFont myFont;
char[] letters = { 'ë', 'ö', 'ä', 'ü' };
String[] fonts = { "Impact", "Arial Black" };

float defaultFontSize = 160;
int xSpacing = 80;
int ySpacing = 80;
int MAXFRAMES = 600;
boolean SAVEFRAMES = true;

ArrayList<Character> characters;
PGraphics pg;

void setup() {
  size(450, 800);
    String fontName = fonts[int(random(0, fonts.length))];
  myFont = createFont(fontName, 80);
  
  // Initialize the PGraphics buffer for drawing
  pg = createGraphics(width, height);
  pg.beginDraw();
  pg.background(255);
  pg.textFont(myFont);
  pg.textAlign(CENTER, CENTER);
  pg.endDraw();

  characters = new ArrayList<Character>();
  
  // Populate the list with Character objects
  for (int y = ySpacing / 2; y < height; y += ySpacing) {
    for (int x = xSpacing / 2; x < width; x += xSpacing) {
      characters.add(new Character(x, y));
    }
  }
}

void draw() {
    background(255);

    // Clear the PGraphics buffer
    pg.beginDraw();
    pg.background(255);

    // Set the blend mode for XOR effect
    pg.blendMode(DIFFERENCE);
    pg.fill(255, 255, 255); // Use a distinct color for better effect

    // Draw each character to the PGraphics buffer
    for (Character c : characters) {
        c.update();
        c.display(pg);
    }

    pg.endDraw();

    // Display the PGraphics buffer to the main window
    image(pg, 0, 0);
    if (SAVEFRAMES) {
        saveFrame();
        if (frameCount >= MAXFRAMES) {
            noLoop();
        }
    }
}

class Character {
    float x, y;
    float angle;
    float rotationSpeed;
    int randomIndex;
    char myChar = 'ë';

  Character(float _x, float _y) {
    x = _x;
    y = _y;
    angle = random(360); // Random initial angle
    rotationSpeed = random(-3, 3); // Random rotation speed
    randomIndex  = int(random(letters.length));
  
    // Select the letter at that random index
    myChar = letters[randomIndex];
  }

    void update() {
        // Update the angle based on its unique speed
        angle += rotationSpeed;
    }

    void display(PGraphics buffer) {
        buffer.pushMatrix();
        buffer.translate(x, y);
        buffer.rotate(radians(angle));
        buffer.textSize(defaultFontSize);
        buffer.text(myChar, 0, 0);
        buffer.popMatrix();
    }
}