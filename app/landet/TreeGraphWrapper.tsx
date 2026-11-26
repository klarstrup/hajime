"use client";

import dynamic from "next/dynamic";

const TreeGraphWrapper = dynamic(() => import("./TreeGraph"), { ssr: false });

export default TreeGraphWrapper;
