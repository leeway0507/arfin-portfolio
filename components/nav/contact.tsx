import Link from 'next/link'

export default function Contact() {
    return (
        <div className="mx-auto flex flex-col grow align-center text-lg">
            <div className="mx-auto py-20">
                <div className="text-[#f7524d] mb-2 font-bold">Contact</div>
                <div>Paris</div>
                <div className="mb-2">+33 7 75 70 63 08</div>
                <div>Korea</div>
                <div className="mb-2">+82 10 6496 2353</div>
                <div className="mb-2">
                    studio:{' '}
                    <Link
                        className={'underline underline-offset-[5px]'}
                        href={'mailto:arfinyoon@gmail.com'}
                    >
                        arfinyoon@gmail.com
                    </Link>
                </div>
                <div>
                    instagram:{' '}
                    <Link
                        className="underline underline-offset-[5px]"
                        href={'https://www.instagram.com/arfinyoon/'}
                        target="_blank"
                    >
                        arfinyoon
                    </Link>
                </div>
            </div>
        </div>
    )
}
