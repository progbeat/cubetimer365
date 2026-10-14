import "./ScrambleText.css";
import React from "react";

const ScrambleText = React.memo(({ scramble }: { scramble: string }) => {
  return (
    <p className="scramble-moves">
      {scramble.split(" ").map((move, index) => (
        <React.Fragment key={`${index}-${move}`}>
          {index > 0 ? " " : ""}
          <span className="scramble-move">{move}</span>
        </React.Fragment>
      ))}
    </p>
  );
});

export default ScrambleText;
