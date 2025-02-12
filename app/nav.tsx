"use client";

import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
export function Nav() {
    const [openAbuout, setOpenAbout] = useState(false);
    const pathName = usePathname();

    return (
        <>
            <div className="w-full relative h-[3rem] animate-fade">
                {(pathName !== "/" || openAbuout) && (
                    <Link href={"/"} className="absolute inset-y-0 font-bold flex items-center">
                        Arfin Yoon
                    </Link>
                )}
                {!openAbuout && (
                    <div className="flex mx-auto items-center justify-center gap-4 h-full ">
                        <button onClick={() => setOpenAbout((v) => !v)} className={openAbuout ? "font-bold" : ""}>
                            About
                        </button>
                        <Link href={"/photographs"} className={pathName.includes("/photographs") ? "font-bold" : ""}>
                            Photograhps
                        </Link>
                        <Link href={"/contact"} className={pathName === "/contact" ? "font-bold" : ""}>
                            Contact
                        </Link>
                    </div>
                )}
                {openAbuout && (
                    <button onClick={() => setOpenAbout((v) => !v)} className="absolute inset-y-0 right-0 font-bold">
                        Close
                    </button>
                )}
            </div>
            <AnimatePresence>
                {openAbuout && (
                    <div className="absolute z-50 w-[calc(100dvw-4rem)] h-[calc(100dvh-3rem)] backdrop-blur-xl py-2 bg-white/60">
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.5 }}
                            className="flex justify-center flex-col w-full text-center"
                        >
                            <div>
                                Lorem ipsum dolor sit amet consectetur adipisicing elit. Asperiores hic officia ducimus
                                velit soluta minima ratione voluptatem exercitationem odio qui praesentium eos, cumque
                                fugit repudiandae assumenda id. Dicta, perferendis omnis!
                            </div>
                            <div>
                                Lorem ipsum dolor sit amet consectetur adipisicing elit. Enim repellat atque facilis
                                distinctio nisi, numquam minus tempora explicabo nostrum impedit repudiandae ratione
                                dolorem rem quos at vero! Cum, suscipit culpa?
                            </div>
                            <div>
                                Lorem ipsum dolor sit amet consectetur adipisicing elit. Asperiores hic officia ducimus
                                velit soluta minima ratione voluptatem exercitationem odio qui praesentium eos, cumque
                                fugit repudiandae assumenda id. Dicta, perferendis omnis!
                            </div>
                            <div>
                                Lorem ipsum dolor sit amet consectetur adipisicing elit. Asperiores hic officia ducimus
                                velit soluta minima ratione voluptatem exercitationem odio qui praesentium eos, cumque
                                fugit repudiandae assumenda id. Dicta, perferendis omnis!
                            </div>
                            <div>
                                Lorem ipsum dolor sit amet consectetur adipisicing elit. Asperiores hic officia ducimus
                                velit soluta minima ratione voluptatem exercitationem odio qui praesentium eos, cumque
                                fugit repudiandae assumenda id. Dicta, perferendis omnis!
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
