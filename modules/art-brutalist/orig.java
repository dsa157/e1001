/**
 * 3D-Isometric Pipe Network - Uniform Spatial Growth
 * 1. Distributed Start Points: Spawns crawlers across the entire grid to fill gaps.
 * 2. True Temporal Stretch: Controlled movement pace via movementAccumulator.
 * 3. Brutalist Specs: Top Pen (8.0), Gauge (50.0), Jitter (0.35).
 * Version: 2026.01.14.15.22.10
 */

// --- Global Parameters ---
int SKETCH_WIDTH = 480;       
int SKETCH_HEIGHT = 800;      
int PADDING = 40;             
int SEED_VALUE = 42;          
int MAX_FRAMES = 900;         
boolean SAVE_FRAMES = false;  
int ANIMATION_SPEED = 60;     

// ADJUST THIS to control completion speed (1.0 = fast, 5.0 = slow)
float ANIMATION_STRETCH = 15; 

// Brutalist Geometry Parameters
float TOP_GAUGE = 50.0;       
float BOT_GAUGE = 5.0;        
float TOP_PEN = 8.0;          
float BOT_PEN = 0.5;          
float JITTER_STRENGTH = 0.35; 

// 3D Grid Parameters
float ISO_ANGLE = PI/6;       
float Z_HEIGHT_STEP = 55.0;   
int COLS = 32;                
int ROWS = 32;                
int TIERS = 5;                

// Visual Style
int BG_COLOR = #FFFFFF;       
int STROKE_COLOR = #000000;   

// --- Internal Variables ---
float isoScale = 35.0;        
IsoCell[][][] grid;
ArrayList<Connection> allConnections = new ArrayList<Connection>();
ArrayList<IsoCrawler> crawlers;
float gridOffsetX, gridOffsetY;
int totalCells;
int visitedCount = 0;
float movementAccumulator = 0;

void settings() {
  size(SKETCH_WIDTH, SKETCH_HEIGHT);
}

void setup() {
  randomSeed(SEED_VALUE);
  frameRate(ANIMATION_SPEED);
  
  totalCells = COLS * ROWS * TIERS;
  
  grid = new IsoCell[COLS][ROWS][TIERS];
  for (int i = 0; i < COLS; i++) {
    for (int j = 0; j < ROWS; j++) {
      for (int k = 0; k < TIERS; k++) {
        grid[i][j][k] = new IsoCell(i, j, k);
      }
    }
  }
  
  float midI = COLS / 2.0;
  float midJ = ROWS / 2.0;
  float midK = TIERS / 2.0;
  gridOffsetX = (width / 2.0) - (midI - midJ) * cos(ISO_ANGLE) * isoScale;
  gridOffsetY = (height / 2.0) - ((midI + midJ) * sin(ISO_ANGLE) * isoScale - (midK * Z_HEIGHT_STEP));
  
  crawlers = new ArrayList<IsoCrawler>();
  
  // UNIFORM DISTRIBUTION: Spawn crawlers in a grid-like pattern across all tiers
  // This ensures the bottom and corners start filling immediately.
  int spawnDivs = 3; 
  for (int ti = 0; ti < spawnDivs; ti++) {
    for (int tj = 0; tj < spawnDivs; tj++) {
      for (int tk = 0; tk < TIERS; tk += 2) {
        int si = floor(map(ti, 0, spawnDivs-1, 0, COLS-1));
        int sj = floor(map(tj, 0, spawnDivs-1, 0, ROWS-1));
        crawlers.add(new IsoCrawler(si, sj, tk));
      }
    }
  }
}

void draw() {
  background(BG_COLOR);
  
  // Calculate pace to distribute remaining work over remaining frames
  float framesRemaining = max(1, MAX_FRAMES - frameCount);
  float cellsRemaining = (float)(totalCells - visitedCount);
  float rate = (cellsRemaining / framesRemaining) / ANIMATION_STRETCH;
  
  movementAccumulator += rate;
  int stepsToTake = floor(movementAccumulator);
  movementAccumulator -= stepsToTake;

  for (int s = 0; s < stepsToTake; s++) {
    for (IsoCrawler ic : crawlers) {
      ic.update();
    }
  }
  
  pushMatrix();
  translate(gridOffsetX, gridOffsetY);
  // Z-Order Occlusion Rendering
  for (int k = 0; k < TIERS; k++) {
    for (Connection conn : allConnections) {
      if (max(conn.a.k, conn.b.k) == k) {
        conn.display();
      }
    }
  }
  popMatrix();

  if (SAVE_FRAMES) saveFrame("frames/####.tif");
  if (frameCount >= MAX_FRAMES) noLoop();
}

// --- Classes ---

class Connection {
  IsoCell a, b;
  float localJitter;
  
  Connection(IsoCell a, IsoCell b) {
    this.a = a;
    this.b = b;
    this.localJitter = random(-JITTER_STRENGTH, JITTER_STRENGTH);
  }
  
  void display() {
    float sx1 = a.x + gridOffsetX, sy1 = a.y + gridOffsetY;
    float sx2 = b.x + gridOffsetX, sy2 = b.y + gridOffsetY;
    
    if (!a.isInside(sx1, sy1) || !a.isInside(sx2, sy2)) return;

    float midY = (sy1 + sy2) / 2.0;
    float vFactor = constrain(map(midY, PADDING, height-PADDING, 0.0, 1.0), 0.0, 1.0);
    
    float gauge = lerp(TOP_GAUGE, BOT_GAUGE, vFactor);
    float pen = lerp(TOP_PEN, BOT_PEN, vFactor);
    float angle = atan2(b.y - a.y, b.x - a.x) + localJitter;
    float d = dist(a.x, a.y, b.x, b.y);
    float hw = gauge / 2.0;
    
    pushMatrix();
    translate(a.x, a.y);
    rotate(angle);
    
    noStroke();
    fill(BG_COLOR);
    rect(0, -hw, d, gauge);
    
    stroke(STROKE_COLOR);
    strokeWeight(pen);
    noFill();
    line(0, -hw, d, -hw);
    line(0, hw, d, hw);
    line(0, -hw, 0, hw);
    line(d, -hw, d, hw);
    popMatrix();
  }
}

class IsoCell {
  int i, j, k;
  float x, y;
  boolean visited = false;
  IsoCell(int i, int j, int k) {
    this.i = i; this.j = j; this.k = k;
    this.x = (i - j) * cos(ISO_ANGLE) * isoScale;
    this.y = (i + j) * sin(ISO_ANGLE) * isoScale - (k * Z_HEIGHT_STEP);
  }
  boolean isInside(float sx, float sy) {
    return sx > PADDING && sx < width - PADDING && sy > PADDING && sy < height - PADDING;
  }
}

class IsoCrawler {
  IsoCell current;
  ArrayList<IsoCell> stack = new ArrayList<IsoCell>();
  int lastAxis = -1; 
  boolean active = true;

  IsoCrawler(int i, int j, int k) {
    current = grid[i][j][k];
    current.visited = true;
    visitedCount++;
  }
  
  void update() {
    if (!active) return;
    IsoCell next = getNeighbor(current);
    if (next != null) {
      next.visited = true;
      visitedCount++;
      stack.add(current);
      allConnections.add(new Connection(current, next));
      if (next.i != current.i) lastAxis = 0;
      else if (next.j != current.j) lastAxis = 1;
      else lastAxis = 2;
      current = next;
    } else if (stack.size() > 0) {
      current = stack.remove(stack.size() - 1);
      lastAxis = -1;
    } else {
      active = false;
    }
  }
  
  IsoCell getNeighbor(IsoCell c) {
    ArrayList<IsoCell> neighbors = new ArrayList<IsoCell>();
    int[][] offsets = {{1,0,0}, {-1,0,0}, {0,1,0}, {0,-1,0}, {0,0,1}, {0,0,-1}};
    for (int axis = 0; axis < 3; axis++) {
      if (axis == lastAxis) continue; 
      for (int dir = 0; dir < 2; dir++) {
        int idx = axis * 2 + dir;
        int ni = c.i + offsets[idx][0], nj = c.j + offsets[idx][1], nk = c.k + offsets[idx][2];
        if (ni >= 0 && nj >= 0 && nk >= 0 && ni < COLS && nj < ROWS && nk < TIERS) {
          if (!grid[ni][nj][nk].visited) neighbors.add(grid[ni][nj][nk]);
        }
      }
    }
    return neighbors.size() > 0 ? neighbors.get(floor(random(neighbors.size()))) : null;
  }
}