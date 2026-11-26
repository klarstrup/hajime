"use client";

import ForceGraph3D, { NodeObject } from "react-force-graph-3d";
import SpriteText from "three-spritetext";

const TreeGraph: typeof ForceGraph3D = (props) => {
  return (
    <ForceGraph3D
      {...props}
      nodeAutoColorBy={(node) =>
        Array.isArray(node.federation)
          ? node.federation.join(",")
          : node.federation
      }
      nodeLabel={(node) => node.name}
      nodeVal={(node) => (node.type === "federation" ? 10 : 1)}
      onNodeClick={(node) => {
        if (node.url) window.open(node.url, "_blank");
      }}
      nodeThreeObjectExtend={true}
      nodeThreeObject={(node: NodeObject<NodeObject>) => {
        const sprite = new SpriteText(node.name);
        sprite.color = node.color;
        sprite.textHeight = node.type === "federation" ? 8 : 4;
        // @ts-expect-error TypeScript might complain about the sprite object
        sprite.center.y = -1; // shift above node
        sprite.strokeWidth = 2;
        sprite.strokeColor = "black";
        return sprite;
      }}
    />
  );
};

export default TreeGraph;
