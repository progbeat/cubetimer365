# CubeTimer365

CubeTimer365 is a minimalistic Rubik's Cube timer built with React. It generates a new scramble each day and keeps track of your solving history for that day's scramble. The timer also supports dark/light mode based on your system preferences.

## Features

- **Daily Scramble:** Generates a unique scramble each day. The scramble remains the same throughout the day and changes daily.
- **Timer Precision:** The timer has a precision of 10ms.
- **History:** Keeps track of your solve times for the current day's scramble.
- **Dark/Light Mode:** Automatically adjusts to your system's dark or light mode.

## Usage

- **Start Timer:** Press and release the `Space` key to start the timer.
- **Stop Timer:** Press and hold the `Space` key to stop the timer.
- **View History:** Your solve times are saved in a list below the timer.

## Random Scramble Rules

- **Non-redundant Rotations:** Two consecutive moves should not affect the same face (e.g., `U U2` is invalid as it can be simplified).
- **Perpendicular Face Rule:** Any sequence of three moves must involve at least two perpendicular faces. For example, `R L R` is not allowed as it can be simplified.

## How It Works

1. **Daily Scramble Generation:**
   The scramble for each day is generated based on the current date. The same scramble will appear for the entire day, ensuring consistency for all solves on the same day.

2. **Timer Controls:**
   The timer starts when the `Space` key is released and stops when the `Space` key is pressed again. It accurately tracks the time with a precision of 10 milliseconds.

3. **History:**
   All solve times for the current day's scramble are stored in the history section, which displays your solve times in the order they were recorded.

## Getting Started

To run the app locally, follow these steps:

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/progbeat/cubetimer365.git
   cd cubetimer365
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the app:
   ```bash
   npm start
   ```

   The app will run locally at [http://localhost:3000](http://localhost:3000).

### Build for Production

To create an optimized production build:

```bash
npm run build
```

The optimized build will be available in the `build` directory.

## Deployment

The project uses GitHub Actions to automatically deploy the app to GitHub Pages whenever the `master` branch is updated.

To manually deploy:

1. Run the build command:
   ```bash
   npm run build
   ```

2. Deploy to GitHub Pages:
   ```bash
   npm run deploy
   ```

## GitHub Pages

The app is published and accessible at [progbeat.github.io/cubetimer365](https://progbeat.github.io/cubetimer365/).

## Contributing

Feel free to fork this repository, make updates, and submit pull requests. Contributions are welcome!

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Acknowledgments

This project was created as a simple, daily Rubik's Cube timer to track solve times with random scrambles that follow common cubing rules. The app features light and dark mode support and is optimized for use in browsers.
