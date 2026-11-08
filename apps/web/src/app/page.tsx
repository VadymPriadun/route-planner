import Link from 'next/link';

export default function HomePage() {
  return (
      <main className="lp">
        <section className="hero">
          <div>
            <span className="pill-tag"><i /> Флоренція · дані OpenStreetMap</span>
            <h1>
              Два дні, що <em>відчуваються</em> як тиждень.
            </h1>
            <p className="lead">
              Опишіть подорож словами. ШІ зрозуміє побажання, а власний алгоритм розкладе
              місця по днях, вибере найкоротший шлях і додасть обід та каву.
            </p>
            <div className="hero-cta">
              <Link href="/planner"><button className="btn">Створити маршрут →</button></Link>
              <Link href="#how"><button className="btn btn-secondary">Як це працює</button></Link>
            </div>
          </div>

          <div>
            <div className="float-card">
              <div className="fc-head"><span>День 1 · 1.6 км пішки</span><span className="fc-tag">Економія часу</span></div>
              <div className="fc-row"><b>09:00</b><span>Ponte Vecchio</span></div>
              <div className="fc-row"><b>09:49</b><span>Galleria degli Uffizi</span></div>
              <div className="fc-row"><b>11:22</b><span>Palazzo Vecchio</span></div>
              <div className="fc-row"><b>12:57</b><span>Обід поруч із маршрутом</span></div>
            </div>
            <div className="float-card">
              <div className="fc-head"><span>День 2 · Дуомо та Сан-Лоренцо</span></div>
              <div className="fc-row"><b>09:00</b><span>Cattedrale di Santa Maria del Fiore</span></div>
              <div className="fc-row"><b>09:47</b><span>Campanile di Giotto</span></div>
            </div>
          </div>
        </section>

        <div className="stats">
          <div className="stat"><b>2 544</b><span>реальних місць Флоренції</span></div>
          <div className="stat"><b>2-opt</b><span>оптимізація порядку обходу</span></div>
          <div className="stat"><b>K-Means · DBSCAN</b><span>групування по днях</span></div>
          <div className="stat"><b>37</b><span>автоматичних тестів</span></div>
        </div>

        <section className="section" id="how">
          <h2>ШІ розуміє, алгоритм будує. Без вигаданих місць.</h2>
          <div className="steps">
            <div className="step">
              <div className="n">01</div>
              <h3>Розкажіть, що хочете</h3>
              <p>«2 дні, люблю мистецтво, не хочу багато ходити». Параметри витягуються з тексту й перевіряються.</p>
            </div>
            <div className="step">
              <div className="n">02</div>
              <h3>Місця діляться по днях</h3>
              <p>Кластеризація групує сусідні об’єкти, щоб не бігати містом туди й назад.</p>
            </div>
            <div className="step">
              <div className="n">03</div>
              <h3>Шлях і розклад</h3>
              <p>Порядок обходу оптимізується, а в розклад додаються обід, кава й посилання на Google Maps.</p>
            </div>
          </div>
        </section>

        <footer className="footer">
          <span>AI Travel &amp; City Explorer · навчальний проєкт</span>
          <span>Дані © OpenStreetMap contributors</span>
        </footer>
      </main>
  );
}