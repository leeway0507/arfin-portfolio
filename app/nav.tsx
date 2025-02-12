"use client";

import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
export function Nav() {
    const [openAbout, setOpenAbout] = useState(false);
    const pathName = usePathname();

    useEffect(() => {
        if (openAbout) {
            document.documentElement.style.overflow = "hidden";
        } else {
            document.documentElement.style.overflow = "";
        }

        // cleanup
        return () => {
            document.documentElement.style.overflow = "";
        };
    }, [openAbout]);

    const height = "h-[3rem]";
    return (
        <>
            {pathName !== "/" && (
                <div className={`z-50 absolute top-0 left-0 px-[2rem] flex items-center justify-start ${height}`}>
                    <Link href={"/"} className={`font-bold flex items-center`}>
                        Arfin Yoon
                    </Link>
                </div>
            )}
            {openAbout ? (
                <div className={`z-50 absolute top-0 right-0 pe-[2rem] flex items-center justify-end ${height}`}>
                    <button onClick={() => setOpenAbout((v) => !v)} className={`font-bold`}>
                        Close
                    </button>
                </div>
            ) : (
                <div
                    className={`z-20 fixed sm:absolute max-sm:bottom-4 sm:top-0 w-full ${height} inset-x-0 bg-white/80`}
                >
                    <div className="flex mx-auto items-center justify-center gap-4 h-full">
                        <button onClick={() => setOpenAbout((v) => !v)} className={openAbout ? "font-bold" : ""}>
                            About
                        </button>
                        <Link href={"/photographs"} className={pathName.includes("/photographs") ? "font-bold" : ""}>
                            Photograhps
                        </Link>
                        <Link href={"/contact"} className={pathName === "/contact" ? "font-bold" : ""}>
                            Contact
                        </Link>
                    </div>
                </div>
            )}
            <AnimatePresence>
                {openAbout && (
                    <div
                        className={`absolute z-10 top-0 inset-x-0 w-[calc(100dvw)] h-[calc(100dvh)] backdrop-blur-xl py-2 bg-white/50 overflow-scroll`}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.5 }}
                            className="pt-[3rem] px-[2rem] flex justify-center flex-col w-full text-center "
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
