import Image from "next/image";
import { ArrowRight, CalendarDays } from "lucide-react";
import { ActionButton } from "@/components/button/action-button";
import { ROUTES } from "@/routes/routes";
import { HOME_MESSAGES } from "@/text/home/home-messages";

interface NewsCardProps {
  category: string;
  date: string;
  title: string;
  image: string;
}

export function NewsCard({ category, date, title, image }: NewsCardProps) {
  return (
    <article className="news-card">
      <Image
        className="news-image"
        src={image}
        alt=""
        width={900}
        height={560}
      />
      <div className="news-body">
        <div className="news-meta">
          <span>{category}</span>
          <span>·</span>
          <CalendarDays size={13} />
          <span>{date}</span>
        </div>
        <h3>{title}</h3>
        <ActionButton href={ROUTES.HOME_SECTIONS.CONTACT} variant="text" icon={<ArrowRight size={14} />}>
          {HOME_MESSAGES.NEWS.READ_MORE}
        </ActionButton>
      </div>
    </article>
  );
}
