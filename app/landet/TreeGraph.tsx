"use client";

import ForceGraph3D from "react-force-graph-3d";

const TreeGraph: typeof ForceGraph3D = (props) => {
  return (
    <ForceGraph3D
      {...props}
      nodeAutoColorBy="federation"
      nodeLabel={(node) => node.name}
      nodeVal={(node) =>
        node.type === "federation" ? (node.membershipCount ?? 10) : 1
      }
      onNodeClick={(node) => {
        if (node.url) window.open(node.url, "_blank");
      }}
    />
  );
};

export default TreeGraph;
