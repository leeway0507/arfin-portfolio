"use client";

import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { div } from "motion/react-client";
import About from "./about";
import Contact from "./contact";

function hoverItems() {
    return (
        <div className="flex gap-2">
            <div>Day</div>
            <div>Line</div>
            <div>Life</div>
        </div>
    );
}
export function Nav() {
    const [openAbout, setOpenAbout] = useState(false);
    const [openContact, setOpenContact] = useState(false);
    const pathName = usePathname();

    const openModal = openAbout || openContact;

    useEffect(() => {
        if (openModal) {
            document.documentElement.style.overflow = "hidden";
        } else {
            document.documentElement.style.overflow = "";
        }

        // cleanup
        return () => {
            document.documentElement.style.overflow = "";
        };
    }, [openAbout]);

    const height = "h-[2.1rem] sm:h-[3rem]";
    return (
        <>
            {pathName !== "/" && (
                <div className={`z-50 absolute top-0 left-0 px-[2rem] flex items-center justify-start ${height}`}>
                    <Link href={"/"} className={`font-black flex items-center`}>
                        Arfin Yoon
                    </Link>
                </div>
            )}
            {openModal ? (
                <div className={`z-50 absolute top-0 right-0 pe-[2rem] flex items-center justify-end ${height}`}>
                    <button
                        onClick={() => {
                            setOpenAbout(false);
                            setOpenContact(false);
                        }}
                        className={`font-black`}
                    >
                        Close
                    </button>
                </div>
            ) : (
                <>
                    <div className={`z-50 absolute top-0 right-0 pe-[2rem] flex items-center justify-end ${height}`}>
                        <button onClick={() => setOpenContact((v) => !v)} className={openContact ? "font-medium" : ""}>
                            Contact
                        </button>
                    </div>
                    <div className={`z-20 fixed sm:absolute max-sm:bottom-4 sm:top-0 w-full inset-x-0 `}>
                        <div className={`rounded-2xl mx-4 bg-white/60 backdrop-blur-sm ${height}`}>
                            <div className="flex mx-auto items-center justify-center gap-4 h-full">
                                <button
                                    onClick={() => setOpenAbout((v) => !v)}
                                    className={openAbout ? "font-medium" : ""}
                                >
                                    About
                                </button>
                                <Link
                                    href={"/photographs"}
                                    className={pathName.includes("/photographs") ? "font-medium" : ""}
                                >
                                    Photograhps
                                </Link>
                            </div>
                        </div>
                    </div>
                </>
            )}
            <AnimatePresence>
                {openModal && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className={`absolute z-10 top-0 inset-x-0 w-[calc(100dvw)] h-[calc(100dvh)] backdrop-blur-xl py-2 bg-white/50 overflow-scroll`}
                    >
                        <div className="pt-[3rem] px-[2rem] flex justify-center flex-col w-full text-center ">
                            {openAbout ? <About /> : openContact && <Contact />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
