interface TestimonialCardProps {
  initials: string;
  name: string;
  role: string;
  quote: string;
}

export function TestimonialCard({ initials, name, role, quote }: TestimonialCardProps) {
  return (
    <article className="testimonial-card">
      <div className="stars" aria-label="5 trên 5 sao">
        {Array.from({ length: 5 }, (_, index) => <span key={index}>★</span>)}
      </div>
      <blockquote>“{quote}”</blockquote>
      <div className="person">
        <div className="avatar">{initials}</div>
        <div>
          <strong>{name}</strong>
          <span>{role}</span>
        </div>
      </div>
    </article>
  );
}
