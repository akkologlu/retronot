import Link from 'next/link'
import { Logo } from '@/components/layout/logo'
import { ArrowLeft } from 'lucide-react'

export default function KVKKPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-8 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo size="sm" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main id="main-content" className="mx-auto max-w-4xl px-8 py-16">
        <div className="space-y-2 mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            KVKK Aydınlatma Metni
          </h1>
          <p className="text-muted-foreground text-sm">Son güncelleme: 28 Mayıs 2026</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-10 text-foreground/90 leading-relaxed">
          {/* Giriş */}
          <section className="space-y-4">
            <p>
              İşbu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;)
              kapsamında, RetroNot platformunu (&quot;Platform&quot;) kullanan siz değerli
              kullanıcılarımızı, kişisel verilerinizin işlenmesine ilişkin bilgilendirmek amacıyla
              hazırlanmıştır.
            </p>
          </section>

          {/* 1 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Veri Sorumlusu</h2>
            <p>
              KVKK kapsamında veri sorumlusu sıfatıyla hareket eden taraf:
            </p>
            <div className="bg-muted/50 rounded-lg p-6 space-y-1">
              <p className="font-medium text-foreground">RetroNot</p>
              <p className="text-foreground/80">E-posta: privacy@retronot.app</p>
              <p className="text-foreground/80">Web: retronot.app</p>
            </div>
          </section>

          {/* 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              2. İşlenen Kişisel Veriler
            </h2>
            <p>
              Platform üzerinden aşağıdaki kişisel verileriniz işlenmektedir:
            </p>

            <h3 className="text-lg font-medium text-foreground">2.1 Kimlik Bilgileri</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Ad ve soyad</li>
              <li>Profil fotoğrafı</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground">2.2 İletişim Bilgileri</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>E-posta adresi</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground">2.3 Kullanıcı İşlem Verileri</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Retrospektif oturumlarında oluşturulan kartlar, yorumlar ve aksiyon maddeleri</li>
              <li>Oylama verileri</li>
              <li>Takım üyeliği ve davet bilgileri</li>
              <li>Oturum geçmişi ve kullanım tercihleri</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground">2.4 İşlem Güvenliği Verileri</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>IP adresi</li>
              <li>Tarayıcı türü ve sürümü</li>
              <li>İşletim sistemi bilgisi</li>
              <li>Oturum açma zaman damgaları</li>
              <li>Çerez ve yerel depolama verileri</li>
            </ul>
          </section>

          {/* 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              3. Kişisel Verilerin İşlenme Amaçları
            </h2>
            <p>
              Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Platformun sunulması, işletilmesi ve sürdürülmesi</li>
              <li>Kullanıcı kimlik doğrulama ve hesap yönetimi</li>
              <li>Retrospektif oturumlarında gerçek zamanlı işbirliği sağlanması</li>
              <li>
                Yapay zekâ destekli özelliklerin sunulması (retrospektif özetleri, duygu analizi,
                aksiyon önerileri)
              </li>
              <li>
                Şifre sıfırlama, takım davetleri gibi işlemsel e-postaların gönderilmesi
              </li>
              <li>Platformun güvenliğinin sağlanması ve kötüye kullanımın önlenmesi</li>
              <li>Kullanım trendlerinin analiz edilerek hizmet kalitesinin artırılması</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi</li>
            </ul>
          </section>

          {/* 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              4. Kişisel Verilerin İşlenme Hukuki Sebepleri
            </h2>
            <p>
              Kişisel verileriniz, KVKK&apos;nın 5. maddesi kapsamında aşağıdaki hukuki sebeplere
              dayanılarak işlenmektedir:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                <strong>Açık rızanız:</strong> Yapay zekâ destekli özelliklerin kullanımı ve
                analitik çerezlerin ayarlanması
              </li>
              <li>
                <strong>Sözleşmenin ifası:</strong> Platform hizmetlerinin sunulması, hesap
                oluşturulması ve yönetilmesi
              </li>
              <li>
                <strong>Hukuki yükümlülük:</strong> Yasal düzenlemelere uyum sağlanması
              </li>
              <li>
                <strong>Meşru menfaat:</strong> Platformun güvenliğinin sağlanması, hata takibi ve
                hizmet kalitesinin artırılması
              </li>
            </ul>
          </section>

          {/* 5 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              5. Kişisel Verilerin Aktarılması
            </h2>
            <p>
              Kişisel verileriniz, KVKK&apos;nın 8. ve 9. maddeleri çerçevesinde aşağıdaki
              taraflara aktarılabilmektedir:
            </p>

            <h3 className="text-lg font-medium text-foreground">5.1 Yurt İçi Aktarım</h3>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Yasal düzenlemeler gereği yetkili kamu kurum ve kuruluşlarına</li>
            </ul>

            <h3 className="text-lg font-medium text-foreground">5.2 Yurt Dışı Aktarım</h3>
            <p className="text-foreground/80">
              Platform altyapısı gereği, kişisel verileriniz aşağıdaki yurt dışında bulunan hizmet
              sağlayıcılarına aktarılabilmektedir:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">
                      Hizmet Sağlayıcı
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">
                      Amaç
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">
                      Konum
                    </th>
                  </tr>
                </thead>
                <tbody className="text-foreground/80">
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium">Supabase</td>
                    <td className="px-4 py-3">Veritabanı, kimlik doğrulama ve gerçek zamanlı altyapı</td>
                    <td className="px-4 py-3">ABD / AB</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium">Vercel</td>
                    <td className="px-4 py-3">Uygulama barındırma ve edge fonksiyonları</td>
                    <td className="px-4 py-3">Global CDN</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-medium">Sentry</td>
                    <td className="px-4 py-3">Hata izleme ve performans takibi</td>
                    <td className="px-4 py-3">ABD</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">OpenAI / Yapay Zekâ Sağlayıcıları</td>
                    <td className="px-4 py-3">Retrospektif özet ve analiz özellikleri</td>
                    <td className="px-4 py-3">ABD</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              Yurt dışı aktarımlar, KVKK&apos;nın 9. maddesi kapsamında yeterli koruma bulunan
              ülkelere veya veri sorumlusunun yeterli korunmayı taahhüt ettiği durumlarda
              gerçekleştirilmektedir.
            </p>
          </section>

          {/* 6 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              6. Kişisel Verilerin Saklanma Süresi
            </h2>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                <strong>Hesap verileri:</strong> Hesabınız aktif olduğu sürece saklanır. Hesap
                silinmesi halinde 30 gün içinde kaldırılır.
              </li>
              <li>
                <strong>Retrospektif içerikleri:</strong> İlgili takım veya retrospektif var olduğu
                sürece saklanır. Arşivlenen retrospektifler, takım yöneticisi tarafından silinene
                kadar muhafaza edilir.
              </li>
              <li>
                <strong>Günlük kayıtları:</strong> Sunucu günlükleri ve anonimleştirilmiş analitik
                veriler, operasyonel ve güvenlik amaçlarıyla 90 güne kadar saklanabilir.
              </li>
              <li>
                <strong>Yedeklemeler:</strong> Şifrelenmiş veritabanı yedekleri, felaket kurtarma
                prosedürleri kapsamında silme sonrasında 30 güne kadar veri içerebilir.
              </li>
            </ul>
          </section>

          {/* 7 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              7. İlgili Kişinin Hakları (KVKK md. 11)
            </h2>
            <p>
              KVKK&apos;nın 11. maddesi uyarınca, kişisel verilerinize ilişkin aşağıdaki haklara
              sahipsiniz:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
              <li>
                Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp
                kullanılmadığını öğrenme
              </li>
              <li>
                Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri
                bilme
              </li>
              <li>
                Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların
                düzeltilmesini isteme
              </li>
              <li>
                KVKK&apos;nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin
                silinmesini veya yok edilmesini isteme
              </li>
              <li>
                Düzeltme ve silme işlemlerinin, kişisel verilerinizin aktarıldığı üçüncü kişilere
                bildirilmesini isteme
              </li>
              <li>
                İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi
                suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme
              </li>
              <li>
                Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız
                hâlinde zararın giderilmesini talep etme
              </li>
            </ul>
          </section>

          {/* 8 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Başvuru Yöntemi</h2>
            <p>
              Yukarıda sayılan haklarınızı kullanmak için aşağıdaki yöntemlerle başvuruda
              bulunabilirsiniz:
            </p>
            <div className="bg-muted/50 rounded-lg p-6 space-y-3">
              <div>
                <p className="font-medium text-foreground">E-posta ile başvuru:</p>
                <p className="text-foreground/80">
                  privacy@retronot.app adresine, kimliğinizi doğrulayan bilgilerle birlikte
                  talebinizi içeren bir e-posta gönderebilirsiniz.
                </p>
              </div>
            </div>
            <p>
              Başvurularınız, talebinizin niteliğine göre en kısa sürede ve en geç{' '}
              <strong>30 (otuz) gün</strong> içinde ücretsiz olarak sonuçlandırılacaktır. İşlemin
              ayrıca bir maliyet gerektirmesi hâlinde, Kişisel Verileri Koruma Kurulu tarafından
              belirlenen tarifedeki ücret alınabilir.
            </p>
          </section>

          {/* 9 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              9. Aydınlatma Metninde Yapılacak Değişiklikler
            </h2>
            <p>
              İşbu Aydınlatma Metni, yasal düzenlemelerdeki değişiklikler veya platformdaki
              güncellemeler doğrultusunda zaman zaman güncellenebilir. Güncellemeler yapıldığında,
              sayfanın üst kısmındaki &quot;Son güncelleme&quot; tarihi değiştirilecektir.
            </p>
            <p>
              Önemli değişiklikler yapılması halinde, Platform üzerinden veya e-posta yoluyla
              bilgilendirme yapılması için makul çaba gösterilecektir.
            </p>
          </section>

          {/* 10 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. İletişim</h2>
            <p>
              KVKK kapsamındaki haklarınız ve kişisel verilerinizin işlenmesi hakkında sorularınız
              için:
            </p>
            <div className="bg-muted/50 rounded-lg p-6 space-y-1">
              <p className="font-medium text-foreground">RetroNot — Kişisel Veri Koruma Birimi</p>
              <p className="text-foreground/80">E-posta: privacy@retronot.app</p>
              <p className="text-foreground/80">Genel: support@retronot.app</p>
            </div>
            <p>
              Kişisel verilerinizin korunmasına ilişkin detaylı bilgi için{' '}
              <Link
                href="/privacy"
                className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
              >
                Gizlilik Politikamızı
              </Link>{' '}
              inceleyebilirsiniz.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-8">
        <div className="mx-auto max-w-4xl flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/cookie-policy" className="hover:text-foreground transition-colors">Cookie Policy</Link>
            <Link href="/kvkk" className="text-foreground font-medium">KVKK</Link>
          </div>
          <p className="text-xs text-muted-foreground/60">© 2026 RetroNot. Tüm hakları saklıdır.</p>
        </div>
      </footer>
    </div>
  )
}
