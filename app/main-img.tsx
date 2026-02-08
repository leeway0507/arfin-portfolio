'use client'

import { motion } from 'motion/react'
import Image from 'next/image'

export default function MainImage() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-[95%] max-w-[640px] sm:w-[55%] m-auto"
        >
            <div className="relative bg-gray-300/50 aspect-[1.53/1]">
                <Image src="/main.jpg" alt="main" priority fill style={{ objectFit: 'contain' }} />
            </div>
        </motion.div>
    )
}
