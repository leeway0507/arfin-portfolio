'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { getPublicHomeImage } from '@/lib/apis/home/api'
import type { HomeImage } from '@/lib/apis/home/types'
import { HomeImageRenderer } from '@/components/home/home-image-renderer'

export default function MainImage() {
    const [homeImage, setHomeImage] = useState<HomeImage | null>(null)
    const [useFallback, setUseFallback] = useState(false)
    const [isResolved, setIsResolved] = useState(false)

    useEffect(() => {
        let mounted = true

        getPublicHomeImage()
            .then((image) => {
                if (!mounted) return
                setHomeImage(image)
                setUseFallback(false)
                setIsResolved(true)
            })
            .catch(() => {
                if (!mounted) return
                setUseFallback(true)
                setIsResolved(true)
            })

        return () => {
            mounted = false
        }
    }, [])

    if (!isResolved) return null

    const imageSrc = useFallback || !homeImage?.imageUrl ? '/main.jpg' : homeImage.imageUrl

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full"
        >
            <HomeImageRenderer
                src={imageSrc}
                alt={homeImage?.alt ?? 'main'}
                layout={homeImage?.layout}
                priority
                onError={() => {
                    if (imageSrc !== '/main.jpg') setUseFallback(true)
                }}
            />
        </motion.div>
    )
}
