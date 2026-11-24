"use client";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import PostnummerMapSVG from "../../postnumre.svg";

export default function PostNummerRangePicker() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [postnummer, setPostnummer] = useState(4490);
  const [spaend, setSpaend] = useState(1000);

  const handlePostnummerChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPostnummer(Number(event.target.value));
  };

  const handleSpaendChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSpaend(Number(event.target.value));
  };

  const rangeStart = Math.max(0, postnummer - spaend);
  const rangeEnd = Math.min(9999, postnummer + spaend);

  useEffect(() => {
    if (svgRef.current) {
      const svgElement = svgRef.current;
      // color the SVG elements based on the range
      const paths = svgElement.querySelectorAll("path");
      for (const path of paths) {
        const postalCodes = path
          .getAttribute("data-postal-code")
          ?.split("-")
          .map((s) => Number(s.trim()));
        for (const postalCode of postalCodes ?? []) {
          path.setAttribute(
            "fill",
            postalCode >= rangeStart && postalCode <= rangeEnd ? "red" : "gray",
          );
        }
      }
    }
  }, [postnummer, rangeEnd, rangeStart, spaend]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        justifyContent: "center",
        flex: 1,
        alignItems: "center",
      }}
    >
      <div>
        Postnummer:{" "}
        <input
          type="range"
          name="postnummer"
          min={0}
          max={9999}
          value={postnummer}
          onChange={handlePostnummerChange}
        />{" "}
        {postnummer}
      </div>
      <div>
        Spaend:{" "}
        <input
          type="range"
          name="spaend"
          min={0}
          max={9999}
          value={spaend}
          onChange={handleSpaendChange}
        />{" "}
        {spaend}
      </div>
      <div>
        Range: {rangeStart}-{rangeEnd}
      </div>
      <PostnummerMapSVG
        ref={svgRef}
        style={{ width: "100%", height: "auto" }}
      />
    </div>
  );
}
